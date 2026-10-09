import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM encryption for payment-recipient secrets at rest
// (account numbers, paybill numbers). Key: 32 random bytes, base64-encoded,
// stored in ENCRYPTION_KEY. Format: v1.<iv>.<ciphertext>.<tag> (all base64).
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64")}.${ciphertext.toString("base64")}.${tag.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, ctB64, tagB64] = payload.split(".");
  if (version !== "v1" || !ivB64 || !ctB64 || !tagB64) {
    throw new Error("Unsupported secret format");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

// Display masking: even decrypted values are masked outside finance views.
export function maskSecret(value: string | null | undefined): string {
  if (!value) return "—";
  const compact = value.replace(/\s/g, "");
  if (compact.length <= 4) return "••••";
  return `••••${compact.slice(-4)}`;
}
