import CryptoJS from "crypto-js";

function getRandomValues(array: Uint8Array): Uint8Array {
  return crypto.getRandomValues(array);
}

// Use the global crypto object (works in both browser and modern Node/Bun)
const cryptoModule = globalThis.crypto;

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
  // Using CryptoJS.PBKDF2 for browser compatibility
  const derived = CryptoJS.PBKDF2(key, "s.cr!", {
    keySize: 32 / 4, // 32 bytes = 8 words (CryptoJS uses 32-bit words)
    iterations: 128,
    hasher: CryptoJS.algo.SHA512,
  });
  return derived.toString();
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
      iv: iv as BufferSource,
    },
    cryptoKey as CryptoKey,
    payload as BufferSource
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
        iv: new Uint8Array(iv) as BufferSource,
      },
      cryptoKey as CryptoKey,
      data as BufferSource
    )
  );
}

// Calculate SHA-256 checksum using Web Crypto API
export const calculateChecksum = async (
  blob: Blob | string
): Promise<string> => {
  let data: ArrayBuffer;
  if (typeof blob === "string") {
    data = new TextEncoder().encode(blob).buffer as ArrayBuffer;
  } else {
    data = await blob.arrayBuffer();
  }
  const hashBuffer = await cryptoModule.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};
