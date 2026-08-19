import CryptoJS from "crypto-js";
import { Base64 } from "js-base64";

const cryptoModule = globalThis.crypto;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

const USER_KEY_BYTES = 32;
const GCM_IV_BYTES = 12;
const STRING_V2_PREFIX = "scr:v2:";
const BUFFER_V2_PREFIX = new Uint8Array([
  0x73, 0x2e, 0x63, 0x72, 0x00, 0x76, 0x32, 0x00,
]);
const V2_KDF_SALT = textEncoder.encode("s.cr/v2");

export type StringPayloadPurpose = "note" | "filename";

export const generateUserKey = (): string => {
  const bytes = cryptoModule.getRandomValues(new Uint8Array(USER_KEY_BYTES));
  return Base64.fromUint8Array(bytes, true);
};

/** The v1 key expansion must remain unchanged so existing notes stay readable. */
const expandLegacyKey = (key: string): string => {
  const derived = CryptoJS.PBKDF2(key, "s.cr!", {
    keySize: 32 / 4,
    iterations: 128,
    hasher: CryptoJS.algo.SHA512,
  });
  return derived.toString();
};

async function deriveV2Key(key: string, purpose: string): Promise<CryptoKey> {
  const keyMaterial = await cryptoModule.subtle.importKey(
    "raw",
    textEncoder.encode(key),
    "HKDF",
    false,
    ["deriveKey"]
  );

  return cryptoModule.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: V2_KDF_SALT,
      info: textEncoder.encode(`s.cr/v2/${purpose}`),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function stringAdditionalData(purpose: StringPayloadPurpose): Uint8Array {
  return textEncoder.encode(`s.cr/v2/string/${purpose}`);
}

export const encryptStringPayload = async (
  payload: string,
  key: string,
  purpose: StringPayloadPurpose = "note"
): Promise<string> => {
  const cryptoKey = await deriveV2Key(key, `string/${purpose}`);
  const iv = cryptoModule.getRandomValues(new Uint8Array(GCM_IV_BYTES));
  const ciphertext = await cryptoModule.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: stringAdditionalData(purpose) as BufferSource,
      tagLength: 128,
    },
    cryptoKey,
    textEncoder.encode(payload)
  );

  const envelope = new Uint8Array(iv.length + ciphertext.byteLength);
  envelope.set(iv);
  envelope.set(new Uint8Array(ciphertext), iv.length);
  return STRING_V2_PREFIX + Base64.fromUint8Array(envelope, true);
};

export const decryptStringPayload = async (
  payload: string,
  key: string,
  purpose: StringPayloadPurpose = "note"
): Promise<string> => {
  if (!payload.startsWith(STRING_V2_PREFIX)) {
    const decrypted = CryptoJS.AES.decrypt(payload, expandLegacyKey(key));
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  const envelope = Base64.toUint8Array(payload.slice(STRING_V2_PREFIX.length));
  if (envelope.length < GCM_IV_BYTES + 16) {
    throw new Error("Invalid v2 string envelope");
  }

  const cryptoKey = await deriveV2Key(key, `string/${purpose}`);
  const cleartext = await cryptoModule.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: envelope.slice(0, GCM_IV_BYTES),
      additionalData: stringAdditionalData(purpose) as BufferSource,
      tagLength: 128,
    },
    cryptoKey,
    envelope.slice(GCM_IV_BYTES)
  );
  return textDecoder.decode(cleartext);
};

async function generateLegacyCryptoKey(key: string): Promise<CryptoKey> {
  const keyMaterial = await cryptoModule.subtle.importKey(
    "raw",
    textEncoder.encode(expandLegacyKey(key)),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return cryptoModule.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: textEncoder.encode("s.cr!"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function hasV2BufferPrefix(payload: Uint8Array): boolean {
  return (
    payload.length >= BUFFER_V2_PREFIX.length &&
    BUFFER_V2_PREFIX.every((byte, index) => payload[index] === byte)
  );
}

export async function encryptBuffer(
  payload: Uint8Array,
  key: string
): Promise<Uint8Array> {
  const cryptoKey = await deriveV2Key(key, "file");
  const iv = cryptoModule.getRandomValues(new Uint8Array(GCM_IV_BYTES));
  const additionalData = textEncoder.encode("s.cr/v2/file");
  const encrypted = await cryptoModule.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: additionalData as BufferSource,
      tagLength: 128,
    },
    cryptoKey,
    payload as BufferSource
  );

  const result = new Uint8Array(
    BUFFER_V2_PREFIX.length + iv.length + encrypted.byteLength
  );
  result.set(BUFFER_V2_PREFIX);
  result.set(iv, BUFFER_V2_PREFIX.length);
  result.set(new Uint8Array(encrypted), BUFFER_V2_PREFIX.length + iv.length);
  return result;
}

export async function decryptBuffer(
  payload: Uint8Array,
  key: string
): Promise<Uint8Array> {
  if (!hasV2BufferPrefix(payload)) {
    const cryptoKey = await generateLegacyCryptoKey(key);
    const iv = payload.slice(0, GCM_IV_BYTES);
    const data = payload.slice(GCM_IV_BYTES);
    return new Uint8Array(
      await cryptoModule.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, data)
    );
  }

  const offset = BUFFER_V2_PREFIX.length;
  if (payload.length < offset + GCM_IV_BYTES + 16) {
    throw new Error("Invalid v2 file envelope");
  }

  const cryptoKey = await deriveV2Key(key, "file");
  const iv = payload.slice(offset, offset + GCM_IV_BYTES);
  const data = payload.slice(offset + GCM_IV_BYTES);
  return new Uint8Array(
    await cryptoModule.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: textEncoder.encode("s.cr/v2/file"),
        tagLength: 128,
      },
      cryptoKey,
      data
    )
  );
}

export const calculateChecksum = async (
  blob: Blob | string
): Promise<string> => {
  let data: ArrayBuffer;
  if (typeof blob === "string") {
    data = textEncoder.encode(blob).buffer as ArrayBuffer;
  } else {
    data = await blob.arrayBuffer();
  }
  const hashBuffer = await cryptoModule.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
