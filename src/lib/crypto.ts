import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-do-not-use-in-production";
const JWT_EXPIRES_IN = "7d";
const JWT_REFRESH_EXPIRES_IN = "30d";
const API_KEY_PREFIX = "asm_";
const API_KEY_LENGTH = 48;

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiKeyData {
  id: string;
  key: string;
  hash: string;
  prefix: string;
  createdAt: Date;
  expiresAt?: Date;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: {
  sub: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken(payload: {
  sub: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

export function generateTokenPair(payload: {
  sub: string;
  email: string;
  role: string;
}): TokenPair {
  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  const decoded = jwt.decode(accessToken) as JwtPayload;
  const expiresIn = decoded ? decoded.exp - Math.floor(Date.now() / 1000) : 3600;
  
  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

export function generateApiKey(): ApiKeyData {
  const id = crypto.randomUUID();
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH);
  const key = `${API_KEY_PREFIX}${randomBytes.toString("base64url")}`;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  
  return {
    id,
    key,
    hash,
    prefix: key.slice(0, 12),
    createdAt: new Date(),
  };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function verifyApiKey(key: string, hash: string): boolean {
  const keyHash = hashApiKey(key);
  return crypto.timingSafeEqual(Buffer.from(keyHash), Buffer.from(hash));
}

export function generateSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

export function generateOtp(length: number = 6): string {
  const digits = "0123456789";
  let otp = "";
  const randomValues = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[randomValues[i]! % 10];
  }
  return otp;
}

export function hashData(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function createHmac(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

export function verifyHmac(
  data: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function encrypt(
  data: string,
  secret: string
): { iv: string; encrypted: string } {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(secret, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return {
    iv: iv.toString("hex"),
    encrypted,
  };
}

export function decrypt(
  encryptedData: string,
  iv: string,
  secret: string
): string {
  const key = crypto.scryptSync(secret, "salt", 32);
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    key,
    Buffer.from(iv, "hex")
  );
  
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac(signedPayload, secret);
  return `t=${timestamp},v1=${signature}`;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance: number = 300
): boolean {
  const elements = signature.split(",");
  const timestamp = elements[0]?.split("=")[1];
  const v1 = elements[1]?.split("=")[1];
  
  if (!timestamp || !v1) return false;
  
  const timestampNum = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  
  if (now - timestampNum > tolerance) return false;
  
  const signedPayload = `${timestamp}.${payload}`;
  return verifyHmac(signedPayload, v1, secret);
}

export function generateStateParameter(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return Buffer.from(digest).toString("base64url");
}
