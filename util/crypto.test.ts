import { expect, test, describe } from "bun:test";
import {
  encryptStringPayload,
  decryptStringPayload,
  generateUserKey,
  encryptBuffer,
  decryptBuffer,
} from "./crypto";

describe("Crypto Utils", () => {
  test("generateUserKey should return a string of length 10", () => {
    const key = generateUserKey();
    expect(key.length).toBe(10);
  });

  test("encryptPayload and decryptPayload should work together", () => {
    const originalText = "Hello, World!";
    const key = generateUserKey();
    const encrypted = encryptStringPayload(originalText, key);
    console.log(encrypted);
    const decrypted = decryptStringPayload(encrypted, key);
    expect(decrypted).toBe(originalText);
  });

  test("encryptBufferPayload and decryptBufferPayload should work together", async () => {
    const originalData = new Uint8Array([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    const key = generateUserKey();
    const encrypted = await encryptBuffer(originalData, key);
    console.log("encrypted", encrypted);
    const decrypted = await decryptBuffer(encrypted, key);
    console.log("decrypted", decrypted);
    expect(decrypted).toEqual(originalData);
  });
});
