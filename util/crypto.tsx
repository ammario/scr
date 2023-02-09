import { pbkdf2, pbkdf2Sync } from "crypto";
import { AES } from "crypto-ts";

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
  return pbkdf2Sync(key, "s.cr!", 1000, 32, "sha512").toString();
};

export const encryptPayload = (payload: string, key: string): string => {
  return AES.encrypt(payload, expandKey(key)).toString();
};

export const decryptPayload = (payload: string, key: string): string => {
  return AES.decrypt(payload, expandKey(key)).toString();
};
