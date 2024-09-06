import { pbkdf2Sync } from "crypto";
import { AES } from "crypto-ts";
import { createHash } from "crypto";
import { enc } from "crypto-ts";

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

export const encryptPayload = (payload: string, key: string): string => {
  const encrypted = AES.encrypt(payload, expandKey(key));
  return encrypted.toString();
};

export const decryptPayload = (payload: string, key: string): string => {
  const decrypted = AES.decrypt(payload, expandKey(key));
  return decrypted.toString(enc.Utf8);
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
