import type { NextApiRequest, NextApiResponse } from "next";
import { getNote, deleteNote, Note } from "../../../lib/gcs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id, peek } = req.query;

  if (typeof id !== "string") {
    return res.status(400).send("Invalid note ID");
  }

  res.setHeader("Cache-Control", "no-cache");

  try {
    const note = await getNote(id);

    if (!note) {
      return res.status(404).send("note not found");
    }

    // Check if expired
    const isExpired = new Date(note.expires_at) < new Date();

    // When peek is set, we don't return the contents but we let the viewer
    // check the metadata. This is useful for prompting "are you sure?"
    if (peek === "true" && note.destroy_after_read) {
      const peekResponse: Note = {
        ...note,
        contents: "",
        file_contents: undefined,
      };
      return res.status(200).json(peekResponse);
    }

    // Delete if destroy_after_read or expired
    if (note.destroy_after_read || isExpired) {
      const deleted = await deleteNote(id);
      if (!deleted) {
        console.error("Failed to delete note:", id);
        // If we can't delete and it was supposed to be destroyed, treat as not found
        // to avoid showing the same note twice
        if (note.destroy_after_read) {
          return res.status(404).send("note not found");
        }
      }
    }

    if (isExpired) {
      // sshhh - return 404 for expired notes
      return res.status(404).send("note not found");
    }

    // Set Content-Length for progress bar support
    const jsonResponse = JSON.stringify(note);
    res.setHeader("Content-Length", Buffer.byteLength(jsonResponse));
    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(jsonResponse);
  } catch (error) {
    console.error("Error getting note:", error);
    return res.status(500).send("Failed to read object");
  }
}
