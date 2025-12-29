import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { createNote, getNote, deleteNote, Note, MAX_NOTE_SIZE } from "../../lib/gcs";

const app = new Hono();

const MAX_EXPIRY_DAYS = 30;

// API Routes
app.post("/api/notes", async (c) => {
  try {
    const formData = await c.req.formData();
    
    const contents = formData.get("contents") as string || "";
    const expiresAt = formData.get("expires_at") as string;
    const destroyAfterRead = formData.get("destroy_after_read") === "true";
    const version = parseInt(formData.get("version") as string || "1", 10);
    const fileName = formData.get("file_name") as string | null;
    const fileBlob = formData.get("file_contents") as Blob | null;

    // Validate expiry
    const expiresAtDate = new Date(expiresAt);
    const maxExpiry = new Date();
    maxExpiry.setDate(maxExpiry.getDate() + MAX_EXPIRY_DAYS);

    if (expiresAtDate > maxExpiry) {
      return c.text("Note expires too far into the future", 400);
    }

    // Build the note object
    const note: Note = {
      contents,
      expires_at: expiresAt,
      destroy_after_read: destroyAfterRead,
      version,
    };

    // Handle file upload
    if (fileBlob && fileName) {
      const fileBuffer = await fileBlob.arrayBuffer();
      if (fileBuffer.byteLength > MAX_NOTE_SIZE) {
        return c.text(`File exceeds max note size of ${MAX_NOTE_SIZE} bytes`, 400);
      }
      note.file_contents = Buffer.from(fileBuffer).toString("base64");
      note.file_name = fileName;
    }

    if (contents.length > MAX_NOTE_SIZE) {
      return c.text(`Contents exceed max note size of ${MAX_NOTE_SIZE} bytes`, 400);
    }

    const objectId = await createNote(note);
    if (!objectId) {
      return c.text("An internal error occurred", 500);
    }

    return c.text(objectId, 201);
  } catch (error) {
    console.error("Error creating note:", error);
    return c.text("An internal error occurred", 500);
  }
});

app.get("/api/notes/:id", async (c) => {
  const id = c.req.param("id");
  const peek = c.req.query("peek");

  c.header("Cache-Control", "no-cache");

  try {
    const note = await getNote(id);

    if (!note) {
      return c.text("note not found", 404);
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
      return c.json(peekResponse);
    }

    // Delete if destroy_after_read or expired
    if (note.destroy_after_read || isExpired) {
      const deleted = await deleteNote(id);
      if (!deleted) {
        console.error("Failed to delete note:", id);
        // If we can't delete and it was supposed to be destroyed, treat as not found
        // to avoid showing the same note twice
        if (note.destroy_after_read) {
          return c.text("note not found", 404);
        }
      }
    }

    if (isExpired) {
      // sshhh - return 404 for expired notes
      return c.text("note not found", 404);
    }

    const jsonResponse = JSON.stringify(note);
    c.header("Content-Length", Buffer.byteLength(jsonResponse).toString());
    c.header("Content-Type", "application/json");
    return c.body(jsonResponse);
  } catch (error) {
    console.error("Error getting note:", error);
    return c.text("Failed to read object", 500);
  }
});

// Serve static files from dist (built Vite app)
app.use("/*", serveStatic({ root: "./dist" }));

// SPA fallback - serve index.html for all non-API routes
app.get("*", serveStatic({ path: "./dist/index.html" }));

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};
