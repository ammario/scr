import { expect, test, describe } from "bun:test";
import { encryptPayload, decryptPayload, generateUserKey } from "./crypto";

describe("Crypto Utils", () => {
  test("generateUserKey should return a string of length 10", () => {
    const key = generateUserKey();
    expect(key.length).toBe(10);
  });

  test("encryptPayload and decryptPayload should work together", () => {
    const originalText = "Hello, World!";
    const key = generateUserKey();
    const encrypted = encryptPayload(originalText, key);
    console.log(encrypted);
    const decrypted = decryptPayload(encrypted, key);
    expect(decrypted).toBe(originalText);
  });
});
