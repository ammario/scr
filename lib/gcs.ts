import { Storage } from "@google-cloud/storage";
import { randomInt } from "node:crypto";

const BUCKET_NAME = "scr-notes";
const MAX_NOTE_SIZE = 250 << 20; // 250MB
// Note IDs are public locators, not secrets. Base62 keeps them URL-unreserved;
// starting at two characters fits the current working set and the allocator
// extends IDs on collision, so growth affects length rather than correctness.
const NOTE_NAME_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const MIN_NOTE_ID_LENGTH = 2;

// Singleton storage client
let storageClient: Storage | null = null;

export function getStorage(): Storage {
  if (!storageClient) {
    storageClient = new Storage();
  }
  return storageClient;
}

export function getBucket() {
  return getStorage().bucket(BUCKET_NAME);
}

export interface Note {
  contents: string;
  expires_at: string;
  destroy_after_read: boolean;
  version: number;
  file_name?: string;
  file_contents?: string; // base64 encoded
}

function randNoteChar(): string {
  return NOTE_NAME_CHARSET[randomInt(NOTE_NAME_CHARSET.length)];
}

/**
 * Find a short ID for a new note object.
 * Keeps adding characters until we find an ID that doesn't exist.
 */
export async function findObjectID(): Promise<string> {
  const bucket = getBucket();
  let name = "";

  while (true) {
    name += randNoteChar();
    if (name.length < MIN_NOTE_ID_LENGTH) {
      continue;
    }

    const [exists] = await bucket.file(name).exists();
    if (!exists) {
      return name;
    }
  }
}

export async function getNote(id: string): Promise<Note | null> {
  const bucket = getBucket();
  const file = bucket.file(id);

  try {
    const [exists] = await file.exists();
    if (!exists) {
      return null;
    }

    const [contents] = await file.download();
    return JSON.parse(contents.toString()) as Note;
  } catch (error) {
    console.error("Error reading note:", error);
    return null;
  }
}

export async function deleteNote(id: string): Promise<boolean> {
  const bucket = getBucket();
  const file = bucket.file(id);

  try {
    await file.delete();
    return true;
  } catch (error) {
    console.error("Error deleting note:", error);
    return false;
  }
}

export async function createNote(note: Note): Promise<string | null> {
  const bucket = getBucket();
  const noteJson = JSON.stringify(note);

  if (noteJson.length > MAX_NOTE_SIZE) {
    throw new Error(`Note exceeds max size of ${MAX_NOTE_SIZE} bytes`);
  }

  // Try up to 10 times to find a unique ID
  for (let attempts = 0; attempts < 10; attempts++) {
    const objectName = await findObjectID();
    const file = bucket.file(objectName);

    try {
      // Use precondition to avoid race conditions
      await file.save(noteJson, {
        preconditionOpts: {
          ifGenerationMatch: 0, // Only create if doesn't exist
        },
        contentType: "application/json",
      });

      console.log("Created note:", objectName, "size:", noteJson.length);
      return objectName;
    } catch (error) {
      // If precondition failed (object exists), try again
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 412
      ) {
        continue;
      }
      throw error;
    }
  }

  console.error("Could not allocate object ID after 10 attempts");
  return null;
}

export { BUCKET_NAME, MAX_NOTE_SIZE };
