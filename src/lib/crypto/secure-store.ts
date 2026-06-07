import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

/**
 * Server-only helpers for encrypting sensitive values (e.g. third-party
 * integration tokens) before they are persisted, satisfying the requirement
 * that highly sensitive data is stored in a secure, non-public manner.
 *
 * Uses AES-256-GCM (authenticated encryption). The key is supplied via the
 * INTEGRATION_ENCRYPTION_KEY env var as a base64-encoded 32-byte value and must
 * never be committed or exposed to the client bundle.
 */

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const KEY_LENGTH = 32
const PAYLOAD_VERSION = "v1"

function getKey(): Buffer {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY
  if (!raw) throw new Error("INTEGRATION_ENCRYPTION_KEY is not set")

  const key = Buffer.from(raw, "base64")
  if (key.length !== KEY_LENGTH)
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key")

  return key
}

/** Encrypts a plaintext secret into a versioned, self-describing string safe to store. */
export function encryptSecret(plaintext: string): string {
  if (typeof plaintext !== "string") throw new Error("encryptSecret expects a string")

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [PAYLOAD_VERSION, iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":")
}

/** Decrypts a payload produced by {@link encryptSecret}. Throws if tampered or malformed. */
export function decryptSecret(payload: string): string {
  const parts = payload.split(":")
  if (parts.length !== 4 || parts[0] !== PAYLOAD_VERSION) throw new Error("Malformed encrypted payload")

  const [, ivB64, tagB64, dataB64] = parts
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))

  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()])
  return decrypted.toString("utf8")
}

/** Generates a fresh base64 key suitable for INTEGRATION_ENCRYPTION_KEY (use in setup scripts). */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString("base64")
}
