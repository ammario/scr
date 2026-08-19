import CryptoJS from "crypto-js";
import { describe, expect, test } from "vitest";
import {
  decryptBuffer,
  decryptStringPayload,
  encryptBuffer,
  encryptStringPayload,
  generateUserKey,
} from "./crypto";

const legacyExpandKey = (key: string): string =>
  CryptoJS.PBKDF2(key, "s.cr!", {
    keySize: 32 / 4,
    iterations: 128,
    hasher: CryptoJS.algo.SHA512,
  }).toString();

async function encryptLegacyBuffer(
  payload: Uint8Array,
  key: string
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(legacyExpandKey(key)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const cryptoKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("s.cr!"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    payload as BufferSource
  );
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);
  return result;
}

describe("Crypto Utils", () => {
  test("generateUserKey returns a 256-bit base64url key", () => {
    const key = generateUserKey();
    expect(key).toHaveLength(43);
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(generateUserKey()).not.toBe(key);
  });

  test("v2 string payloads round-trip", async () => {
    const originalText = "Hello, World!";
    const key = generateUserKey();
    const encrypted = await encryptStringPayload(originalText, key);
    expect(encrypted).toMatch(/^scr:v2:/);
    await expect(decryptStringPayload(encrypted, key)).resolves.toBe(originalText);
  });

  test("v2 strings reject ciphertext tampering", async () => {
    const key = generateUserKey();
    const encrypted = await encryptStringPayload("authenticated", key);
    const index = encrypted.length - 5;
    const replacement = encrypted[index] === "A" ? "B" : "A";
    const tampered =
      encrypted.slice(0, index) + replacement + encrypted.slice(index + 1);
    await expect(decryptStringPayload(tampered, key)).rejects.toThrow();
  });

  test("v2 string purposes are cryptographically separated", async () => {
    const key = generateUserKey();
    const encrypted = await encryptStringPayload("secret.txt", key, "filename");
    await expect(decryptStringPayload(encrypted, key)).rejects.toThrow();
    await expect(
      decryptStringPayload(encrypted, key, "filename")
    ).resolves.toBe("secret.txt");
  });

  test("decrypts legacy v1 string payloads", async () => {
    const key = "AbCdEf1234";
    const legacy = CryptoJS.AES.encrypt(
      "legacy note",
      legacyExpandKey(key)
    ).toString();
    await expect(decryptStringPayload(legacy, key)).resolves.toBe("legacy note");
  });

  test("v2 buffer payloads round-trip and detect tampering", async () => {
    const originalData = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const key = generateUserKey();
    const encrypted = await encryptBuffer(originalData, key);
    await expect(decryptBuffer(encrypted, key)).resolves.toEqual(originalData);

    const tampered = encrypted.slice();
    tampered[tampered.length - 1] ^= 1;
    await expect(decryptBuffer(tampered, key)).rejects.toThrow();
  });

  test("decrypts legacy v1 buffer payloads", async () => {
    const key = "AbCdEf1234";
    const originalData = new Uint8Array([9, 8, 7, 6, 5, 4]);
    const legacy = await encryptLegacyBuffer(originalData, key);
    await expect(decryptBuffer(legacy, key)).resolves.toEqual(originalData);
  });
});
