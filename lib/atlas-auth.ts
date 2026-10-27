import { createHash, createHmac, timingSafeEqual } from "node:crypto";
export const ATLAS_COOKIE = "atlas-generator-auth";
const passwordHash = process.env.ATLAS_PASSWORD_SHA256 || "cd3093c5120d1f8bd54780cb35b87d547461579bf079286bb6d8c16d07068ea6";
const secret = process.env.ATLAS_SESSION_SECRET || passwordHash;
export function atlasPasswordMatches(value: string) {
  const actual = createHash("sha256").update(value).digest("hex");
  return actual.length === passwordHash.length && timingSafeEqual(Buffer.from(actual), Buffer.from(passwordHash));
}
export function atlasSessionToken(expires = Date.now() + 12 * 60 * 60 * 1000) {
  const payload = String(expires);
  return `${payload}.${createHmac("sha256", secret).update(`atlas:${payload}`).digest("hex")}`;
}
export function atlasSessionValid(token?: string) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!/^\d+$/.test(payload || "") || Number(payload) < Date.now() || !signature) return false;
  const expected = atlasSessionToken(Number(payload));
  return token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
