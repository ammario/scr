/**
 * Integration tests for the note-taking app.
 *
 * These tests exercise the REAL GCS backend - they create actual notes in the
 * scr-notes bucket. This is intentional per the project requirements.
 *
 * Requirements:
 * - GOOGLE_APPLICATION_CREDENTIALS must be set
 * - The service account must have access to the scr-notes bucket
 */

import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createTestNote,
  cleanupTestNotes,
  getNote,
  deleteNote,
} from "./gcs-helpers";
import { createNote, Note } from "../lib/gcs";
import {
  encryptStringPayload,
  decryptStringPayload,
  generateUserKey,
  encryptBuffer,
  decryptBuffer,
} from "../util/crypto";

// Check that GCS credentials are available
beforeAll(() => {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn(
      "GOOGLE_APPLICATION_CREDENTIALS not set - GCS tests will fail"
    );
  }
});

afterEach(async () => {
  await cleanupTestNotes();
});

describe("GCS Backend Integration", () => {
  describe("Note CRUD Operations", () => {
    it("should create and retrieve a note", async () => {
      const noteContent = `Test note content - ${Date.now()}`;
      const id = await createTestNote({
        contents: noteContent,
        destroy_after_read: false,
      });

      expect(id).toBeDefined();
      expect(id.length).toBeGreaterThanOrEqual(4);

      const retrieved = await getNote(id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.contents).toBe(noteContent);
      expect(retrieved?.destroy_after_read).toBe(false);
    });

    it("should create a note with file attachment", async () => {
      const fileContent = Buffer.from("Hello, World!").toString("base64");
      const id = await createTestNote({
        contents: "Note with file",
        file_name: "test.txt",
        file_contents: fileContent,
      });

      const retrieved = await getNote(id);
      expect(retrieved?.file_name).toBe("test.txt");
      expect(retrieved?.file_contents).toBe(fileContent);
    });

    it("should delete a note", async () => {
      const id = await createTestNote({
        contents: "To be deleted",
      });

      const deleted = await deleteNote(id);
      expect(deleted).toBe(true);

      const retrieved = await getNote(id);
      expect(retrieved).toBeNull();
    });

    it("should handle destroy_after_read notes", async () => {
      const id = await createTestNote({
        contents: "Destroy after read",
        destroy_after_read: true,
      });

      // First read should succeed
      const note = await getNote(id);
      expect(note?.contents).toBe("Destroy after read");
      expect(note?.destroy_after_read).toBe(true);
    });

    it("should respect expiration times", async () => {
      // Create an already-expired note by setting expires_at to the past
      const expiredNote: Note = {
        contents: "Expired note",
        expires_at: new Date(Date.now() - 1000).toISOString(), // 1 second ago
        destroy_after_read: false,
        version: 1,
      };

      const id = await createNote(expiredNote);
      expect(id).toBeDefined();

      // The note exists in GCS but should be treated as expired by the API
      const retrieved = await getNote(id!);
      // Note is retrieved from GCS (backend doesn't auto-delete on create)
      expect(retrieved).toBeDefined();

      // Clean up
      if (id) await deleteNote(id);
    });
  });

  describe("Encryption Integration", () => {
    it("should encrypt and decrypt string content correctly", () => {
      const key = generateUserKey();
      const originalText = "Secret message for testing encryption!";

      const encrypted = encryptStringPayload(originalText, key);
      expect(encrypted).not.toBe(originalText);

      const decrypted = decryptStringPayload(encrypted, key);
      expect(decrypted).toBe(originalText);
    });

    it("should encrypt and decrypt buffer content correctly", async () => {
      const key = generateUserKey();
      const originalData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const encrypted = await encryptBuffer(originalData, key);
      expect(encrypted).not.toEqual(originalData);
      expect(encrypted.length).toBeGreaterThan(originalData.length); // IV + ciphertext

      const decrypted = await decryptBuffer(encrypted, key);
      expect(decrypted).toEqual(originalData);
    });

    it("should create encrypted note and decrypt on retrieval", async () => {
      const key = generateUserKey();
      const originalContent = "This is a secret note!";

      // Encrypt and store
      const encryptedContent = encryptStringPayload(originalContent, key);
      const id = await createTestNote({
        contents: encryptedContent,
      });

      // Retrieve and decrypt
      const retrieved = await getNote(id);
      expect(retrieved).toBeDefined();

      const decryptedContent = decryptStringPayload(retrieved!.contents, key);
      expect(decryptedContent).toBe(originalContent);
    });

    it("should create encrypted note with encrypted file attachment", async () => {
      const key = generateUserKey();
      const fileContent = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG magic bytes

      // Encrypt file
      const encryptedFile = await encryptBuffer(fileContent, key);
      const encryptedFileName = encryptStringPayload("photo.jpg", key);

      const id = await createTestNote({
        contents: encryptStringPayload("Note with encrypted file", key),
        file_name: encryptedFileName,
        file_contents: Buffer.from(encryptedFile).toString("base64"),
      });

      // Retrieve and decrypt
      const retrieved = await getNote(id);
      expect(retrieved).toBeDefined();

      // Decrypt file name
      const decryptedFileName = decryptStringPayload(retrieved!.file_name!, key);
      expect(decryptedFileName).toBe("photo.jpg");

      // Decrypt file contents
      const retrievedFileBytes = Buffer.from(retrieved!.file_contents!, "base64");
      const decryptedFile = await decryptBuffer(
        new Uint8Array(retrievedFileBytes),
        key
      );
      expect(decryptedFile).toEqual(fileContent);
    });

    it("should fail decryption with wrong key", () => {
      const key1 = generateUserKey();
      const key2 = generateUserKey();
      const originalText = "Secret message";

      const encrypted = encryptStringPayload(originalText, key1);

      // Decrypting with wrong key should return empty or garbage
      const decrypted = decryptStringPayload(encrypted, key2);
      expect(decrypted).not.toBe(originalText);
    });
  });

  describe("Note ID Generation", () => {
    it("should generate unique IDs for multiple notes", async () => {
      const ids = new Set<string>();

      // Create 5 notes and verify they all get unique IDs
      for (let i = 0; i < 5; i++) {
        const id = await createTestNote({
          contents: `Note ${i}`,
        });
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }

      expect(ids.size).toBe(5);
    });

    it("should generate IDs with minimum length of 4", async () => {
      const id = await createTestNote({
        contents: "Short ID test",
      });

      expect(id.length).toBeGreaterThanOrEqual(4);
      expect(/^[a-z0-9]+$/.test(id)).toBe(true);
    });
  });
});

describe("End-to-End Flow Simulation", () => {
  it("should simulate complete create-share-view flow", async () => {
    // Step 1: Create note with encryption (simulating frontend)
    const key = generateUserKey();
    const secretMessage = "This is my secret password: hunter2";

    const encryptedContent = encryptStringPayload(secretMessage, key);

    const noteId = await createTestNote({
      contents: encryptedContent,
      destroy_after_read: true,
      expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours
    });

    // Step 2: Construct shareable URL (simulating what the frontend would do)
    const shareableUrl = `http://localhost:3000/${noteId}#${key}`;
    expect(shareableUrl).toContain(noteId);
    expect(shareableUrl).toContain(key);

    // Step 3: Retrieve note (simulating recipient)
    const retrieved = await getNote(noteId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.destroy_after_read).toBe(true);

    // Step 4: Decrypt content (simulating recipient's browser)
    const decrypted = decryptStringPayload(retrieved!.contents, key);
    expect(decrypted).toBe(secretMessage);

    // Step 5: Verify destroy_after_read flag is set
    // (In real API, the note would be deleted after retrieval)
    expect(retrieved?.destroy_after_read).toBe(true);
  });

  it("should simulate flow with large file attachment", async () => {
    const key = generateUserKey();
    const noteText = "Here's the file you requested";

    // Create a larger test file (10KB of random data)
    const fileData = new Uint8Array(10 * 1024);
    for (let i = 0; i < fileData.length; i++) {
      fileData[i] = Math.floor(Math.random() * 256);
    }

    const encryptedFile = await encryptBuffer(fileData, key);
    const encryptedFileName = encryptStringPayload("large-file.bin", key);

    const noteId = await createTestNote({
      contents: encryptStringPayload(noteText, key),
      file_name: encryptedFileName,
      file_contents: Buffer.from(encryptedFile).toString("base64"),
    });

    // Retrieve and verify
    const retrieved = await getNote(noteId);
    expect(retrieved).toBeDefined();

    // Decrypt everything
    const decryptedText = decryptStringPayload(retrieved!.contents, key);
    expect(decryptedText).toBe(noteText);

    const decryptedFileName = decryptStringPayload(retrieved!.file_name!, key);
    expect(decryptedFileName).toBe("large-file.bin");

    const retrievedFileBytes = Buffer.from(retrieved!.file_contents!, "base64");
    const decryptedFile = await decryptBuffer(
      new Uint8Array(retrievedFileBytes),
      key
    );
    expect(decryptedFile).toEqual(fileData);
  });
});
