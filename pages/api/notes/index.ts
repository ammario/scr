import type { NextApiRequest, NextApiResponse } from "next";
import { createNote, Note, MAX_NOTE_SIZE } from "../../../lib/gcs";
import formidable from "formidable";
import { readFile } from "fs/promises";

// Disable Next.js body parsing so we can handle multipart form data
export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_EXPIRY_DAYS = 30;

interface ParsedFormData {
  contents: string;
  expires_at: string;
  destroy_after_read: boolean;
  version: number;
  file_name?: string;
  file_contents?: Buffer;
}

async function parseForm(req: NextApiRequest): Promise<ParsedFormData> {
  const form = formidable({
    maxFileSize: MAX_NOTE_SIZE,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      const getField = (name: string): string => {
        const value = fields[name];
        if (Array.isArray(value)) return value[0] || "";
        return value || "";
      };

      const result: ParsedFormData = {
        contents: getField("contents"),
        expires_at: getField("expires_at"),
        destroy_after_read: getField("destroy_after_read") === "true",
        version: parseInt(getField("version") || "1", 10),
      };

      // Handle file upload
      const fileField = files["file_contents"];
      if (fileField) {
        const file = Array.isArray(fileField) ? fileField[0] : fileField;
        if (file && file.filepath) {
          result.file_contents = await readFile(file.filepath);
          result.file_name = getField("file_name");
        }
      }

      resolve(result);
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const parsed = await parseForm(req);

    // Validate contents
    if (
      parsed.contents.length > MAX_NOTE_SIZE ||
      (parsed.file_contents && parsed.file_contents.length > MAX_NOTE_SIZE)
    ) {
      return res
        .status(400)
        .send(`Contents or file exceed max note size of ${MAX_NOTE_SIZE} bytes`);
    }

    // Validate expiry
    const expiresAt = new Date(parsed.expires_at);
    const maxExpiry = new Date();
    maxExpiry.setDate(maxExpiry.getDate() + MAX_EXPIRY_DAYS);

    if (expiresAt > maxExpiry) {
      return res.status(400).send("Note expires too far into the future");
    }

    // Build the note object
    const note: Note = {
      contents: parsed.contents,
      expires_at: parsed.expires_at,
      destroy_after_read: parsed.destroy_after_read,
      version: parsed.version,
    };

    if (parsed.file_contents && parsed.file_name) {
      note.file_contents = parsed.file_contents.toString("base64");
      note.file_name = parsed.file_name;
    }

    const objectId = await createNote(note);
    if (!objectId) {
      return res.status(500).send("An internal error occurred");
    }

    return res.status(201).send(objectId);
  } catch (error) {
    console.error("Error creating note:", error);
    return res.status(500).send("An internal error occurred");
  }
}
