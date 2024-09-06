import { pbkdf2Sync } from "crypto";
import { AES } from "crypto-ts";
import { createHash } from "crypto";
import { enc } from "crypto-ts";
import CryptoJS from "crypto-js";
import { WordArray } from "crypto-ts/src/lib/WordArray";

export const generateUserKey = (): string => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  // Approximately 60 bits of entropy.
  let counter = 0;
  while (counter < 10) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

const expandKey = (key: string): string => {
  // this can never change
  return pbkdf2Sync(key, "s.cr!", 128, 32, "sha512").toString();
};

export const encryptStringPayload = (payload: string, key: string): string => {
  return CryptoJS.AES.encrypt(payload, expandKey(key)).toString();
};

export const encryptBufferPayload = (
  payload: ArrayBufferLike,
  key: string
): ArrayBuffer => {
  const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(payload));
  const encrypted = CryptoJS.AES.encrypt(wordArray, expandKey(key));
  // Convert the ciphertext WordArray directly to ArrayBuffer
  const encryptedWords = encrypted.ciphertext.words;
  const encryptedBuffer = new ArrayBuffer(encrypted.ciphertext.sigBytes);
  const encryptedView = new DataView(encryptedBuffer);
  for (let i = 0; i < encryptedWords.length; i++) {
    encryptedView.setUint32(i * 4, encryptedWords[i], false);
  }
  return encryptedBuffer;
};

export const decryptStringPayload = (payload: string, key: string): string => {
  const decrypted = CryptoJS.AES.decrypt(payload, expandKey(key));
  return decrypted.toString(CryptoJS.enc.Utf8);
};

export const decryptBufferPayload = (
  payload: ArrayBuffer,
  key: string
): ArrayBuffer => {
  // Convert ArrayBuffer to WordArray
  const payloadWords = CryptoJS.lib.WordArray.create(new Uint8Array(payload));

  // Create a CipherParams object
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: payloadWords,
  });

  // Decrypt the payload
  const decrypted = CryptoJS.AES.decrypt(cipherParams, expandKey(key));

  // Convert the decrypted WordArray directly to ArrayBuffer
  const decryptedWords = decrypted.words;
  const decryptedBuffer = new ArrayBuffer(decrypted.sigBytes);
  const decryptedView = new DataView(decryptedBuffer);
  for (let i = 0; i < decrypted.sigBytes; i += 4) {
    decryptedView.setUint32(i, decryptedWords[i / 4], false);
  }

  return decryptedBuffer;
};

// Add this new function
export const calculateChecksum = async (
  blob: Blob | string
): Promise<string> => {
  if (typeof blob === "string") {
    return createHash("sha256").update(blob).digest("hex");
  }
  const arrayBuffer = await blob.arrayBuffer();
  const hash = createHash("sha256");
  hash.update(Buffer.from(arrayBuffer));
  return hash.digest("hex");
};
