import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || "./public/uploads";
const S3_BUCKET = process.env.S3_BUCKET || "";
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "";
const S3_ENDPOINT = process.env.S3_ENDPOINT || "";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/mov", "video/avi"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
}

export interface StorageProvider {
  upload(key: string, data: Buffer, contentType: string): Promise<UploadResult>;
  delete(key: string): Promise<boolean>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  getPublicUrl(key: string): string;
  exists(key: string): Promise<boolean>;
}

class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private getFullPath(key: string): string {
    return path.join(this.basePath, key);
  }

  async upload(
    key: string,
    data: Buffer,
    contentType: string
  ): Promise<UploadResult> {
    const fullPath = this.getFullPath(key);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, data);
    
    return {
      url: `/uploads/${key}`,
      key,
      size: data.length,
      contentType,
    };
  }

  async delete(key: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(key);
      await fs.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    return this.getPublicUrl(key);
  }

  getPublicUrl(key: string): string {
    return `/uploads/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(key);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private accessKey: string;
  private secretKey: string;
  private endpoint: string;

  constructor() {
    this.bucket = S3_BUCKET;
    this.region = S3_REGION;
    this.accessKey = S3_ACCESS_KEY;
    this.secretKey = S3_SECRET_KEY;
    this.endpoint = S3_ENDPOINT;
  }

  private getBaseUrl(): string {
    if (this.endpoint) {
      return `${this.endpoint}/${this.bucket}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
  }

  private async signRequest(
    method: string,
    key: string,
    contentType?: string
  ): Promise<Headers> {
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = date.slice(0, 8);
    const credential = `${this.accessKey}/${dateStamp}/${this.region}/s3/aws4_request`;
    
    const headers = new Headers();
    headers.set("x-amz-date", date);
    headers.set("x-amz-content-sha256", "UNSIGNED-PAYLOAD");
    
    if (contentType) {
      headers.set("Content-Type", contentType);
    }
    
    return headers;
  }

  async upload(
    key: string,
    data: Buffer,
    contentType: string
  ): Promise<UploadResult> {
    const url = `${this.getBaseUrl()}/${key}`;
    
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "x-amz-acl": "public-read",
      },
      body: data,
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.statusText}`);
    }

    return {
      url: this.getPublicUrl(key),
      key,
      size: data.length,
      contentType,
    };
  }

  async delete(key: string): Promise<boolean> {
    try {
      const url = `${this.getBaseUrl()}/${key}`;
      const response = await fetch(url, { method: "DELETE" });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const url = `${this.getBaseUrl()}/${key}`;
    const date = new Date();
    date.setSeconds(date.getSeconds() + expiresIn);
    
    const expiration = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 8);
    
    const policy = {
      expiration,
      conditions: [
        { bucket: this.bucket },
        ["starts-with", "$key", key],
        { acl: "public-read" },
      ],
    };
    
    const policyBase64 = Buffer.from(JSON.stringify(policy)).toString("base64");
    const signature = crypto
      .createHmac("sha256", this.secretKey)
      .update(`${dateStamp}\n${policyBase64}`)
      .digest("hex");

    return `${url}?policy=${policyBase64}&signature=${signature}`;
  }

  getPublicUrl(key: string): string {
    return `${this.getBaseUrl()}/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const url = `${this.getBaseUrl()}/${key}`;
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }
}

function createStorageProvider(): StorageProvider {
  if (S3_BUCKET && S3_ACCESS_KEY && S3_SECRET_KEY) {
    return new S3StorageProvider();
  }
  return new LocalStorageProvider(LOCAL_STORAGE_PATH);
}

const storage = createStorageProvider();

export function generateStorageKey(
  userId: string,
  filename: string,
  folder: string = "media"
): string {
  const ext = path.extname(filename);
  const hash = crypto.randomBytes(16).toString("hex");
  const date = new Date();
  const datePath = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  return `${folder}/${userId}/${datePath}/${hash}${ext}`;
}

export function validateFileType(file: File): boolean {
  return ALLOWED_TYPES.includes(file.type);
}

export function validateFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase().slice(1);
}

export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
}

export function isVideoFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ["mp4", "mov", "avi", "webm"].includes(ext);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export async function uploadFile(
  file: File,
  userId: string,
  folder: string = "media"
): Promise<UploadResult> {
  if (!validateFileType(file)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`);
  }
  
  if (!validateFileSize(file)) {
    throw new Error(`File too large. Maximum size: ${formatFileSize(MAX_FILE_SIZE)}`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = generateStorageKey(userId, file.name, folder);
  
  return storage.upload(key, buffer, file.type);
}

export async function deleteFile(key: string): Promise<boolean> {
  return storage.delete(key);
}

export async function getFileUrl(
  key: string,
  expiresIn?: number
): Promise<string> {
  return storage.getSignedUrl(key, expiresIn);
}

export async function getPublicUrl(key: string): Promise<string> {
  return storage.getPublicUrl(key);
}

export async function fileExists(key: string): Promise<boolean> {
  return storage.exists(key);
}

export async function uploadMultipleFiles(
  files: File[],
  userId: string,
  folder: string = "media"
): Promise<UploadResult[]> {
  const results = await Promise.all(
    files.map((file) => uploadFile(file, userId, folder))
  );
  return results;
}

export async function generateThumbnail(
  key: string,
  width: number = 300,
  height: number = 300
): Promise<string> {
  const thumbnailKey = key.replace(/(\.[^.]+)$/, `_thumb${width}x${height}$1`);
  return storage.getPublicUrl(thumbnailKey);
}

export async function getImageMetadata(
  key: string
): Promise<{ width: number; height: number; format: string } | null> {
  return null;
}

export async function optimizeImage(
  key: string,
  options: ImageOptimizationOptions = {}
): Promise<string> {
  const { width = 800, quality = 80, format = "webp" } = options;
  const optimizedKey = key.replace(
    /(\.[^.]+)$/,
    `_opt_${width}w_q${quality}.${format}`
  );
  return storage.getPublicUrl(optimizedKey);
}

export async function copyFile(
  sourceKey: string,
  destKey: string
): Promise<boolean> {
  try {
    const url = await storage.getSignedUrl(sourceKey);
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    await storage.upload(destKey, buffer, "application/octet-stream");
    return true;
  } catch {
    return false;
  }
}

export async function getStorageUsage(
  userId: string
): Promise<{ used: number; limit: number }> {
  const used = 0;
  const limit = 5 * 1024 * 1024 * 1024;
  return { used, limit };
}

export { storage, LocalStorageProvider, S3StorageProvider };
