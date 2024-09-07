import { createHash, pbkdf2Sync } from "crypto";
import CryptoJS from "crypto-js";
import { webcrypto } from "crypto";

function getRandomValues(array: Uint8Array): Uint8Array {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return crypto.getRandomValues(array);
  }
  return webcrypto.getRandomValues(array);
}

// Use the global crypto object if available (browser), otherwise use webcrypto from Node.js
const cryptoModule = typeof crypto !== "undefined" ? crypto : webcrypto;

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
  // this can never change, and must be deterministic
  return pbkdf2Sync(key, "s.cr!", 128, 32, "sha512").toString();
};

export const encryptStringPayload = (payload: string, key: string): string => {
  return CryptoJS.AES.encrypt(payload, expandKey(key)).toString();
};

export const decryptStringPayload = (payload: string, key: string): string => {
  const decrypted = CryptoJS.AES.decrypt(payload, expandKey(key));
  return decrypted.toString(CryptoJS.enc.Utf8);
};

async function generateCryptoKey(key: string): Promise<CryptoKey> {
  const keyMaterial = (await cryptoModule.subtle.importKey(
    "raw",
    new TextEncoder().encode(expandKey(key)),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  )) as CryptoKey;

  return cryptoModule.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("s.cr!"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  ) as Promise<CryptoKey>;
}

export async function encryptBuffer(
  payload: Uint8Array,
  key: string
): Promise<Uint8Array> {
  const cryptoKey = await generateCryptoKey(key);
  const iv = getRandomValues(new Uint8Array(12));
  const encrypted = await cryptoModule.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    cryptoKey as any,
    payload
  );

  // Prepend the IV to the encrypted data
  const result = new Uint8Array(iv.byteLength + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.byteLength);
  return result;
}

export async function decryptBuffer(
  payload: Uint8Array,
  key: string
): Promise<Uint8Array> {
  const cryptoKey = await generateCryptoKey(key);
  const iv = payload.slice(0, 12);
  const data = payload.slice(12);

  return new Uint8Array(
    await cryptoModule.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(iv),
      },
      cryptoKey,
      data
    )
  );
}

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
