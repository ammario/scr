import CryptoJS from "crypto-js";
import { Base64 } from "js-base64";
import { describe, expect, test } from "vitest";
import {
  CURRENT_CRYPTO_VERSION,
  createNoteDecryptor,
  createNoteEncryptor,
  decryptBuffer,
  decryptStringPayload,
  encryptBuffer,
  encryptStringPayload,
  generateUserKey,
} from "./crypto";

// Frozen released-suite fixtures must never be regenerated from current code.
// They make accidental changes to a historical envelope or KDF visible.
const V3_KEY = "AbCdEf0123_-xy";
const V3_NOTE =
  "scr:v3:y4CPXdne-gXa8OcC9hPOfLroakfGcOKfhoExXARMARugaIDZ6atHUQRCSwzCHAI37hxROf5yimDr0w";
const V3_FILENAME =
  "scr:v3:y4CPXdne-gXa8OcC9hPOfEiv6KXuEKdSmg58lNiumuX1NPtE-os7-og6rq9uRPraynnOZIWU";
const V3_FILE =
  "cy5jcgB2MwDLgI9d2d76Bdrw5wL2E858k3dM-kUBptrMJYpABhjTn1Ey6gihVyfTOnRCTRwDhlw";
const V2_256_BIT_KEY = "eJ7pTdglpx84MwvMq92SaYIIiYg4Y9a_VBO8BebIFMM";
const V2_256_BIT_NOTE =
  "scr:v2:Auh0X3HODnhdXrnArPneG9VFaYQqd44WrSrSyABKUZALkKAR9flxex8qR9A";
const V2_128_BIT_KEY = "AQIDBAUGBwgJCgsMDQ4PEA";
const V2_128_BIT_NOTE =
  "scr:v2:lbhPr3E5tpu5hCKN1b3Jr9ad8Kuue9QAyPO2gRBU95SOduOyY9YAeTEfqPrG_i4CquF7Pw";
const V2_FILE = "cy5jcgB2MgDliwHap80gbsq1HruD4bo6OVZ9kmc_uzWBR3F1G4u5dpdD";

const legacyExpandKey = (key: string): string =>
  CryptoJS.PBKDF2(key, "s.cr!", {
    keySize: 32 / 4,
    iterations: 128,
    hasher: CryptoJS.algo.SHA512,
  }).toString();

async function encryptLegacyBuffer(
  payload: Uint8Array,
  key: string,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(legacyExpandKey(key)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
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
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    payload as BufferSource,
  );
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);
  return result;
}

describe("Crypto Utils", () => {
  test("generateUserKey returns exactly 84 uniform base64url bits", () => {
    const key = generateUserKey();
    expect(key).toHaveLength(14);
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(generateUserKey()).not.toBe(key);
  });

  test("decrypts frozen v3 suite fixtures", async () => {
    const decryptor = createNoteDecryptor(V3_KEY);
    await expect(decryptor.decryptString(V3_NOTE)).resolves.toBe(
      "frozen v3 note",
    );
    await expect(
      decryptor.decryptString(V3_FILENAME, "filename"),
    ).resolves.toBe("frozen.bin");
    await expect(
      decryptor.decryptBuffer(Base64.toUint8Array(V3_FILE)),
    ).resolves.toEqual(new Uint8Array([222, 173, 190, 239]));
  });

  test("a v3 note session shares its salt and separates payload keys", async () => {
    const key = generateUserKey();
    const encryptor = createNoteEncryptor(key);
    const decryptor = createNoteDecryptor(key);
    const originalFile = new Uint8Array([0, 1, 2, 3, 254, 255]);

    expect(encryptor.version).toBe(CURRENT_CRYPTO_VERSION);
    const note = await encryptor.encryptString("Hello, World!");
    const filename = await encryptor.encryptString("secret.txt", "filename");
    const file = await encryptor.encryptBuffer(originalFile);

    expect(note).toMatch(/^scr:v3:/);
    expect(filename).toMatch(/^scr:v3:/);
    // String envelopes begin with a 16-byte salt. File envelopes begin with
    // the eight-byte binary suite prefix followed by the same salt.
    const noteSalt = Base64.toUint8Array(note.slice("scr:v3:".length)).slice(
      0,
      16,
    );
    const filenameSalt = Base64.toUint8Array(
      filename.slice("scr:v3:".length),
    ).slice(0, 16);
    const fileSalt = file.slice(8, 24);
    expect(filenameSalt).toEqual(noteSalt);
    expect(fileSalt).toEqual(noteSalt);

    await expect(decryptor.decryptString(note)).resolves.toBe("Hello, World!");
    await expect(decryptor.decryptString(filename, "filename")).resolves.toBe(
      "secret.txt",
    );
    await expect(decryptor.decryptBuffer(file)).resolves.toEqual(originalFile);
    await expect(decryptor.decryptString(filename)).rejects.toThrow();
  });

  test("single-payload convenience APIs create and read v3 envelopes", async () => {
    const key = generateUserKey();
    const encryptedString = await encryptStringPayload("one string", key);
    await expect(decryptStringPayload(encryptedString, key)).resolves.toBe(
      "one string",
    );

    const originalBuffer = new Uint8Array([4, 5, 6]);
    const encryptedBuffer = await encryptBuffer(originalBuffer, key);
    await expect(decryptBuffer(encryptedBuffer, key)).resolves.toEqual(
      originalBuffer,
    );
  });

  test("v3 payloads reject ciphertext tampering and wrong keys", async () => {
    const key = generateUserKey();
    const encryptor = createNoteEncryptor(key);
    const encrypted = await encryptor.encryptString("authenticated");
    const index = encrypted.length - 5;
    const replacement = encrypted[index] === "A" ? "B" : "A";
    const tampered =
      encrypted.slice(0, index) + replacement + encrypted.slice(index + 1);

    await expect(decryptStringPayload(tampered, key)).rejects.toThrow();
    await expect(
      decryptStringPayload(encrypted, generateUserKey()),
    ).rejects.toThrow();
  });

  test("decrypts frozen v2 notes with both historical key lengths", async () => {
    await expect(
      decryptStringPayload(V2_256_BIT_NOTE, V2_256_BIT_KEY),
    ).resolves.toBe("existing v2 note");
    await expect(
      decryptStringPayload(V2_128_BIT_NOTE, V2_128_BIT_KEY),
    ).resolves.toBe("existing 128-bit v2 note");
    await expect(
      decryptBuffer(Base64.toUint8Array(V2_FILE), V2_256_BIT_KEY),
    ).resolves.toEqual(new Uint8Array([0, 1, 2, 3, 254, 255]));
  });

  test("decrypts legacy v1 string payloads", async () => {
    const key = "AbCdEf1234";
    const legacy = CryptoJS.AES.encrypt(
      "legacy note",
      legacyExpandKey(key),
    ).toString();
    await expect(decryptStringPayload(legacy, key)).resolves.toBe(
      "legacy note",
    );
  });

  test("v3 buffer payloads detect tampering", async () => {
    const originalData = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const key = generateUserKey();
    const encrypted = await encryptBuffer(originalData, key);
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
