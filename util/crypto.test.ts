import { expect, test, describe } from "bun:test";
import {
  encryptStringPayload,
  decryptStringPayload,
  generateUserKey,
  encryptBufferPayload,
  decryptBufferPayload,
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

  // TODO need to test buffer payload encryption and decryption
});
