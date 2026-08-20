import CryptoJS from "crypto-js";
import { argon2id } from "hash-wasm";
import { Base64 } from "js-base64";

const cryptoModule = globalThis.crypto;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

/**
 * Current (v3) suite parameters are immutable once notes are created with them.
 * A future change must add a new envelope version and decoder rather than changing
 * these constants, otherwise previously-created notes would become unreadable.
 */
export const CURRENT_CRYPTO_VERSION = 3 as const;
export const V3_KDF_PARAMETERS = Object.freeze({
  algorithm: "argon2id" as const,
  // Pre-release Chrome 151 measurements were ~4.4 ms median on the reference
  // client, leaving headroom under the 10 ms median decoding budget.
  memoryKiB: 8 * 1024,
  iterations: 1,
  parallelism: 1,
  saltBytes: 16,
  outputBytes: 32,
});

/**
 * Fourteen uniformly random base64url characters contain exactly 84 bits.
 * Combined with the memory-hard v3 KDF, this is the shortest transport-safe key
 * that clears the documented $1B attack-cost target with a large ASIC allowance.
 * See docs/cryptography.md for the threat model and calculation.
 */
const USER_KEY_CHARACTERS = 14;
const USER_KEY_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const STRING_V2_PREFIX = "scr:v2:";
const STRING_V3_PREFIX = "scr:v3:";
const BUFFER_V2_PREFIX = new Uint8Array([
  0x73, 0x2e, 0x63, 0x72, 0x00, 0x76, 0x32, 0x00,
]);
const BUFFER_V3_PREFIX = new Uint8Array([
  0x73, 0x2e, 0x63, 0x72, 0x00, 0x76, 0x33, 0x00,
]);
const V2_KDF_SALT = textEncoder.encode("s.cr/v2");
const V3_HKDF_SALT = textEncoder.encode("s.cr/v3/hkdf");

export type StringPayloadPurpose = "note" | "filename";

export interface NoteEncryptor {
  readonly version: typeof CURRENT_CRYPTO_VERSION;
  encryptString(
    payload: string,
    purpose?: StringPayloadPurpose,
  ): Promise<string>;
  encryptBuffer(payload: Uint8Array): Promise<Uint8Array>;
}

export interface NoteDecryptor {
  decryptString(
    payload: string,
    purpose?: StringPayloadPurpose,
  ): Promise<string>;
  decryptBuffer(payload: Uint8Array): Promise<Uint8Array>;
}

export const generateUserKey = (): string => {
  // 64 divides 256, so selecting the low six bits is uniform and needs no
  // rejection sampling. Unlike encoding whole bytes, all 14 characters carry
  // six independent bits: 14 * 6 = 84 bits.
  const random = cryptoModule.getRandomValues(
    new Uint8Array(USER_KEY_CHARACTERS),
  );
  return Array.from(random, (byte) => USER_KEY_ALPHABET[byte & 0x3f]).join("");
};

function randomBytes(length: number): Uint8Array {
  return cryptoModule.getRandomValues(new Uint8Array(length));
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(
    parts.reduce((length, part) => length + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function hasPrefix(payload: Uint8Array, prefix: Uint8Array): boolean {
  return (
    payload.length >= prefix.length &&
    prefix.every((byte, index) => payload[index] === byte)
  );
}

function additionalData(
  version: 2 | 3,
  kind: "string" | "file",
  purpose?: StringPayloadPurpose,
): Uint8Array {
  const suffix = kind === "string" ? `/${purpose ?? "note"}` : "";
  return textEncoder.encode(`s.cr/v${version}/${kind}${suffix}`);
}

/** The v1 key expansion must remain unchanged so existing notes stay readable. */
const expandLegacyKey = (key: string): string => {
  const derived = CryptoJS.PBKDF2(key, "s.cr!", {
    keySize: 32 / 4,
    iterations: 128,
    hasher: CryptoJS.algo.SHA512,
  });
  return derived.toString();
};

async function deriveHkdfKey(
  material: BufferSource,
  version: 2 | 3,
  purpose: string,
): Promise<CryptoKey> {
  const keyMaterial = await cryptoModule.subtle.importKey(
    "raw",
    material,
    "HKDF",
    false,
    ["deriveKey"],
  );

  return cryptoModule.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: version === 2 ? V2_KDF_SALT : V3_HKDF_SALT,
      info: textEncoder.encode(`s.cr/v${version}/${purpose}`),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function deriveV2Key(key: string, purpose: string): Promise<CryptoKey> {
  return deriveHkdfKey(textEncoder.encode(key), 2, purpose);
}

async function deriveV3Master(
  key: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  // The public, per-note salt prevents precomputation and reuse of KDF work
  // across notes. It does not need to be secret and is embedded in each v3
  // payload so the ciphertext remains self-describing.
  return argon2id({
    password: key,
    salt,
    parallelism: V3_KDF_PARAMETERS.parallelism,
    iterations: V3_KDF_PARAMETERS.iterations,
    memorySize: V3_KDF_PARAMETERS.memoryKiB,
    hashLength: V3_KDF_PARAMETERS.outputBytes,
    outputType: "binary",
  });
}

function createV3KeyDeriver(key: string) {
  // One note uses one salt for all payloads. Cache only within this short-lived
  // session so Argon2 runs once, while HKDF still creates purpose-specific keys.
  const masterKeys = new Map<string, Promise<Uint8Array>>();

  return async (salt: Uint8Array, purpose: string): Promise<CryptoKey> => {
    const saltId = Base64.fromUint8Array(salt, true);
    let masterKey = masterKeys.get(saltId);
    if (!masterKey) {
      masterKey = deriveV3Master(key, salt);
      masterKeys.set(saltId, masterKey);
    }
    return deriveHkdfKey((await masterKey) as BufferSource, 3, purpose);
  };
}

async function encryptV3String(
  payload: string,
  salt: Uint8Array,
  purpose: StringPayloadPurpose,
  deriveKey: (salt: Uint8Array, purpose: string) => Promise<CryptoKey>,
): Promise<string> {
  const cryptoKey = await deriveKey(salt, `string/${purpose}`);
  const iv = randomBytes(GCM_IV_BYTES);
  const ciphertext = new Uint8Array(
    await cryptoModule.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
        additionalData: additionalData(3, "string", purpose) as BufferSource,
        tagLength: GCM_TAG_BYTES * 8,
      },
      cryptoKey,
      textEncoder.encode(payload),
    ),
  );

  return (
    STRING_V3_PREFIX +
    Base64.fromUint8Array(concatBytes(salt, iv, ciphertext), true)
  );
}

async function decryptV3String(
  payload: string,
  purpose: StringPayloadPurpose,
  deriveKey: (salt: Uint8Array, purpose: string) => Promise<CryptoKey>,
): Promise<string> {
  const envelope = Base64.toUint8Array(payload.slice(STRING_V3_PREFIX.length));
  const minimumLength =
    V3_KDF_PARAMETERS.saltBytes + GCM_IV_BYTES + GCM_TAG_BYTES;
  if (envelope.length < minimumLength) {
    throw new Error("Invalid v3 string envelope");
  }

  const salt = envelope.slice(0, V3_KDF_PARAMETERS.saltBytes);
  const ivOffset = V3_KDF_PARAMETERS.saltBytes;
  const iv = envelope.slice(ivOffset, ivOffset + GCM_IV_BYTES);
  const ciphertext = envelope.slice(ivOffset + GCM_IV_BYTES);
  const cryptoKey = await deriveKey(salt, `string/${purpose}`);
  const cleartext = await cryptoModule.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: additionalData(3, "string", purpose) as BufferSource,
      tagLength: GCM_TAG_BYTES * 8,
    },
    cryptoKey,
    ciphertext,
  );
  return textDecoder.decode(cleartext);
}

async function decryptV2String(
  payload: string,
  key: string,
  purpose: StringPayloadPurpose,
): Promise<string> {
  const envelope = Base64.toUint8Array(payload.slice(STRING_V2_PREFIX.length));
  if (envelope.length < GCM_IV_BYTES + GCM_TAG_BYTES) {
    throw new Error("Invalid v2 string envelope");
  }

  const cryptoKey = await deriveV2Key(key, `string/${purpose}`);
  const cleartext = await cryptoModule.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: envelope.slice(0, GCM_IV_BYTES),
      additionalData: additionalData(2, "string", purpose) as BufferSource,
      tagLength: GCM_TAG_BYTES * 8,
    },
    cryptoKey,
    envelope.slice(GCM_IV_BYTES),
  );
  return textDecoder.decode(cleartext);
}

async function generateLegacyCryptoKey(key: string): Promise<CryptoKey> {
  const keyMaterial = await cryptoModule.subtle.importKey(
    "raw",
    textEncoder.encode(expandLegacyKey(key)),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
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
    ["encrypt", "decrypt"],
  );
}

async function encryptV3Buffer(
  payload: Uint8Array,
  salt: Uint8Array,
  deriveKey: (salt: Uint8Array, purpose: string) => Promise<CryptoKey>,
): Promise<Uint8Array> {
  const cryptoKey = await deriveKey(salt, "file");
  const iv = randomBytes(GCM_IV_BYTES);
  const encrypted = new Uint8Array(
    await cryptoModule.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
        additionalData: additionalData(3, "file") as BufferSource,
        tagLength: GCM_TAG_BYTES * 8,
      },
      cryptoKey,
      payload as BufferSource,
    ),
  );

  return concatBytes(BUFFER_V3_PREFIX, salt, iv, encrypted);
}

async function decryptV3Buffer(
  payload: Uint8Array,
  deriveKey: (salt: Uint8Array, purpose: string) => Promise<CryptoKey>,
): Promise<Uint8Array> {
  const saltOffset = BUFFER_V3_PREFIX.length;
  const minimumLength =
    saltOffset + V3_KDF_PARAMETERS.saltBytes + GCM_IV_BYTES + GCM_TAG_BYTES;
  if (payload.length < minimumLength) {
    throw new Error("Invalid v3 file envelope");
  }

  const salt = payload.slice(
    saltOffset,
    saltOffset + V3_KDF_PARAMETERS.saltBytes,
  );
  const ivOffset = saltOffset + V3_KDF_PARAMETERS.saltBytes;
  const iv = payload.slice(ivOffset, ivOffset + GCM_IV_BYTES);
  const ciphertext = payload.slice(ivOffset + GCM_IV_BYTES);
  const cryptoKey = await deriveKey(salt, "file");
  return new Uint8Array(
    await cryptoModule.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: additionalData(3, "file") as BufferSource,
        tagLength: GCM_TAG_BYTES * 8,
      },
      cryptoKey,
      ciphertext,
    ),
  );
}

async function decryptV2Buffer(
  payload: Uint8Array,
  key: string,
): Promise<Uint8Array> {
  const offset = BUFFER_V2_PREFIX.length;
  if (payload.length < offset + GCM_IV_BYTES + GCM_TAG_BYTES) {
    throw new Error("Invalid v2 file envelope");
  }

  const cryptoKey = await deriveV2Key(key, "file");
  const iv = payload.slice(offset, offset + GCM_IV_BYTES);
  const ciphertext = payload.slice(offset + GCM_IV_BYTES);
  return new Uint8Array(
    await cryptoModule.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: additionalData(2, "file") as BufferSource,
        tagLength: GCM_TAG_BYTES * 8,
      },
      cryptoKey,
      ciphertext,
    ),
  );
}

/**
 * Creates one v3 encryption session for a note. Reuse it for the note text,
 * filename, and file so they share one public salt and one Argon2 evaluation.
 */
export function createNoteEncryptor(key: string): NoteEncryptor {
  const salt = randomBytes(V3_KDF_PARAMETERS.saltBytes);
  const deriveKey = createV3KeyDeriver(key);

  return {
    version: CURRENT_CRYPTO_VERSION,
    encryptString: (payload, purpose = "note") =>
      encryptV3String(payload, salt, purpose, deriveKey),
    encryptBuffer: (payload) => encryptV3Buffer(payload, salt, deriveKey),
  };
}

/**
 * Creates a reader that dispatches by authenticated envelope version. Legacy
 * algorithms stay isolated here and v3 Argon2 work is cached for this note.
 */
export function createNoteDecryptor(key: string): NoteDecryptor {
  const deriveV3Key = createV3KeyDeriver(key);

  return {
    async decryptString(payload, purpose = "note") {
      if (payload.startsWith(STRING_V3_PREFIX)) {
        return decryptV3String(payload, purpose, deriveV3Key);
      }
      if (payload.startsWith(STRING_V2_PREFIX)) {
        return decryptV2String(payload, key, purpose);
      }

      const decrypted = CryptoJS.AES.decrypt(payload, expandLegacyKey(key));
      return decrypted.toString(CryptoJS.enc.Utf8);
    },

    async decryptBuffer(payload) {
      if (hasPrefix(payload, BUFFER_V3_PREFIX)) {
        return decryptV3Buffer(payload, deriveV3Key);
      }
      if (hasPrefix(payload, BUFFER_V2_PREFIX)) {
        return decryptV2Buffer(payload, key);
      }

      const cryptoKey = await generateLegacyCryptoKey(key);
      const iv = payload.slice(0, GCM_IV_BYTES);
      const ciphertext = payload.slice(GCM_IV_BYTES);
      return new Uint8Array(
        await cryptoModule.subtle.decrypt(
          { name: "AES-GCM", iv },
          cryptoKey,
          ciphertext,
        ),
      );
    },
  };
}

/** Convenience wrapper for a single string. Use a session for a whole note. */
export async function encryptStringPayload(
  payload: string,
  key: string,
  purpose: StringPayloadPurpose = "note",
): Promise<string> {
  return createNoteEncryptor(key).encryptString(payload, purpose);
}

/** Compatibility wrapper that automatically dispatches v1, v2, and v3. */
export async function decryptStringPayload(
  payload: string,
  key: string,
  purpose: StringPayloadPurpose = "note",
): Promise<string> {
  return createNoteDecryptor(key).decryptString(payload, purpose);
}

/** Convenience wrapper for one file. Use a session for a whole note. */
export async function encryptBuffer(
  payload: Uint8Array,
  key: string,
): Promise<Uint8Array> {
  return createNoteEncryptor(key).encryptBuffer(payload);
}

/** Compatibility wrapper that automatically dispatches v1, v2, and v3. */
export async function decryptBuffer(
  payload: Uint8Array,
  key: string,
): Promise<Uint8Array> {
  return createNoteDecryptor(key).decryptBuffer(payload);
}

export function isVersionedStringPayload(payload: string): boolean {
  return (
    payload.startsWith(STRING_V2_PREFIX) || payload.startsWith(STRING_V3_PREFIX)
  );
}

export const calculateChecksum = async (
  blob: Blob | string,
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
