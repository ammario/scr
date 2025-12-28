import { getBucket, Note, createNote, getNote, deleteNote } from "../lib/gcs";

/**
 * Track created notes for cleanup after tests
 */
const createdNoteIds: string[] = [];

/**
 * Create a note and track it for cleanup
 */
export async function createTestNote(note: Partial<Note>): Promise<string> {
  const fullNote: Note = {
    contents: note.contents ?? "test content",
    expires_at: note.expires_at ?? new Date(Date.now() + 3600000).toISOString(),
    destroy_after_read: note.destroy_after_read ?? false,
    version: note.version ?? 1,
    file_name: note.file_name,
    file_contents: note.file_contents,
  };

  const id = await createNote(fullNote);
  if (!id) {
    throw new Error("Failed to create test note");
  }
  createdNoteIds.push(id);
  return id;
}

/**
 * Clean up all test notes created during the test run
 */
export async function cleanupTestNotes(): Promise<void> {
  const bucket = getBucket();
  for (const id of createdNoteIds) {
    try {
      await bucket.file(id).delete();
    } catch {
      // Ignore errors - note may have been deleted by the test
    }
  }
  createdNoteIds.length = 0;
}

/**
 * Generate a unique test note ID prefix
 */
export function generateTestPrefix(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export { getNote, deleteNote };
