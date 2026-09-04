import crypto from 'crypto';
import { Readable } from 'stream';

// Media handler types
export interface MediaConfig {
  maxImageSize: number;
  maxVideoSize: number;
  maxImageWidth: number;
  maxImageHeight: number;
  maxVideoWidth: number;
  maxVideoHeight: number;
  supportedImageFormats: string[];
  supportedVideoFormats: string[];
  thumbnailWidth: number;
  thumbnailHeight: number;
  cdnBaseUrl?: string;
  cdnUploadPath?: string;
}

export interface MediaMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  format?: string;
  url?: string;
  thumbnailUrl?: string;
  createdAt: Date;
}

export interface MediaProcessingResult {
  success: boolean;
  metadata: MediaMetadata;
  optimizedUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  stripMetadata?: boolean;
}

export interface VideoProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxDuration?: number;
  bitrate?: string;
  fps?: number;
  codec?: string;
  audioCodec?: string;
}

export interface ThumbnailOptions {
  width: number;
  height: number;
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  format?: 'jpeg' | 'png';
  quality?: number;
}

export interface PlatformSizing {
  platform: string;
  image: {
    width: number;
    height: number;
    aspectRatio: string;
  };
  video: {
    width: number;
    height: number;
    aspectRatio: string;
    maxDuration: number;
  };
  story: {
    width: number;
    height: number;
  };
  reel: {
    width: number;
    height: number;
  };
}

// Platform sizing configurations
export const PLATFORM_SIZING: Record<string, PlatformSizing> = {
  twitter: {
    platform: 'twitter',
    image: { width: 1600, height: 900, aspectRatio: '16:9' },
    video: { width: 1280, height: 720, aspectRatio: '16:9', maxDuration: 140 },
    story: { width: 1080, height: 1920, aspectRatio: '9:16' },
    reel: { width: 1080, height: 1920, aspectRatio: '9:16' },
  },
  linkedin: {
    platform: 'linkedin',
    image: { width: 1200, height: 627, aspectRatio: '1.91:1' },
    video: { width: 1920, height: 1080, aspectRatio: '16:9', maxDuration: 600 },
    story: { width: 1080, height: 1920, aspectRatio: '9:16' },
    reel: { width: 1080, height: 1920, aspectRatio: '9:16' },
  },
  instagram: {
    platform: 'instagram',
    image: { width: 1080, height: 1080, aspectRatio: '1:1' },
    video: { width: 1080, height: 1080, aspectRatio: '1:1', maxDuration: 60 },
    story: { width: 1080, height: 1920, aspectRatio: '9:16' },
    reel: { width: 1080, height: 1920, aspectRatio: '9:16' },
  },
  facebook: {
    platform: 'facebook',
    image: { width: 1200, height: 630, aspectRatio: '1.91:1' },
    video: { width: 1920, height: 1080, aspectRatio: '16:9', maxDuration: 240 },
    story: { width: 1080, height: 1920, aspectRatio: '9:16' },
    reel: { width: 1080, height: 1920, aspectRatio: '9:16' },
  },
  tiktok: {
    platform: 'tiktok',
    image: { width: 1080, height: 1920, aspectRatio: '9:16' },
    video: { width: 1080, height: 1920, aspectRatio: '9:16', maxDuration: 180 },
    story: { width: 1080, height: 1920, aspectRatio: '9:16' },
    reel: { width: 1080, height: 1920, aspectRatio: '9:16' },
  },
};

// Media handler class
export class MediaHandler {
  private config: MediaConfig;

  constructor(config: Partial<MediaConfig> = {}) {
    this.config = {
      maxImageSize: 10 * 1024 * 1024, // 10MB
      maxVideoSize: 100 * 1024 * 1024, // 100MB
      maxImageWidth: 4096,
      maxImageHeight: 4096,
      maxVideoWidth: 3840,
      maxVideoHeight: 2160,
      supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      supportedVideoFormats: ['video/mp4', 'video/quicktime', 'video/webm'],
      thumbnailWidth: 400,
      thumbnailHeight: 300,
      ...config,
    };
  }

  // Validation
  async validateMedia(
    file: File | Buffer | string,
    options?: {
      platform?: string;
      type?: 'image' | 'video';
    }
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      let buffer: Buffer;
      let mimeType: string;
      let size: number;

      if (file instanceof File) {
        buffer = Buffer.from(await file.arrayBuffer());
        mimeType = file.type;
        size = file.size;
      } else if (Buffer.isBuffer(file)) {
        buffer = file;
        mimeType = this.detectMimeType(buffer);
        size = buffer.length;
      } else {
        // URL - fetch the file
        const response = await fetch(file);
        if (!response.ok) {
          return { valid: false, error: 'Failed to fetch media from URL' };
        }
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        mimeType = response.headers.get('content-type') || this.detectMimeType(buffer);
        size = buffer.length;
      }

      // Check size
      if (mimeType.startsWith('image/') && size > this.config.maxImageSize) {
        return {
          valid: false,
          error: `Image size exceeds maximum allowed size (${this.formatSize(this.config.maxImageSize)})`,
        };
      }

      if (mimeType.startsWith('video/') && size > this.config.maxVideoSize) {
        return {
          valid: false,
          error: `Video size exceeds maximum allowed size (${this.formatSize(this.config.maxVideoSize)})`,
        };
      }

      // Check format
      if (mimeType.startsWith('image/') && !this.config.supportedImageFormats.includes(mimeType)) {
        return {
          valid: false,
          error: `Image format ${mimeType} is not supported. Supported formats: ${this.config.supportedImageFormats.join(', ')}`,
        };
      }

      if (mimeType.startsWith('video/') && !this.config.supportedVideoFormats.includes(mimeType)) {
        return {
          valid: false,
          error: `Video format ${mimeType} is not supported. Supported formats: ${this.config.supportedVideoFormats.join(', ')}`,
        };
      }

      // Platform-specific validation
      if (options?.platform) {
        const platformValidation = this.validateForPlatform(buffer, mimeType, options.platform);
        if (!platformValidation.valid) {
          return platformValidation;
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Validation failed: ${(error as Error).message}`,
      };
    }
  }

  private validateForPlatform(
    buffer: Buffer,
    mimeType: string,
    platform: string
  ): { valid: boolean; error?: string } {
    const sizing = PLATFORM_SIZING[platform];
    if (!sizing) {
      return { valid: true };
    }

    // Platform-specific validation logic would go here
    // For now, we'll return valid
    return { valid: true };
  }

  private detectMimeType(buffer: Buffer): string {
    // Simple file signature detection
    const signatures: { mime: string; bytes: number[] }[] = [
      { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
      { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
      { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
      { mime: 'video/mp4', bytes: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70] },
      { mime: 'video/quicktime', bytes: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70] },
    ];

    for (const sig of signatures) {
      if (buffer.slice(0, sig.bytes.length).equals(Buffer.from(sig.bytes))) {
        return sig.mime;
      }
    }

    return 'application/octet-stream';
  }

  // Image processing
  async processImage(
    input: Buffer | string,
    options: ImageProcessingOptions = {}
  ): Promise<MediaProcessingResult> {
    const buffer = await this.getBuffer(input);
    const metadata = this.extractMetadata(buffer, 'image');

    // In a real implementation, you would use a library like Sharp or Jimp
    // For now, we'll return the original buffer
    return {
      success: true,
      metadata: {
        ...metadata,
        width: options.maxWidth || metadata.width || 1920,
        height: options.maxHeight || metadata.height || 1080,
      },
      optimizedUrl: this.config.cdnBaseUrl
        ? `${this.config.cdnBaseUrl}/${metadata.id}`
        : undefined,
    };
  }

  async resizeImage(
    input: Buffer | string,
    width: number,
    height: number,
    options?: ImageProcessingOptions
  ): Promise<MediaProcessingResult> {
    const buffer = await this.getBuffer(input);
    const metadata = this.extractMetadata(buffer, 'image');

    // Resize logic would go here
    return {
      success: true,
      metadata: {
        ...metadata,
        width,
        height,
      },
    };
  }

  async optimizeImage(
    input: Buffer | string,
    options: ImageProcessingOptions = {}
  ): Promise<MediaProcessingResult> {
    const buffer = await this.getBuffer(input);
    const metadata = this.extractMetadata(buffer, 'image');

    // Optimization logic would go here
    return {
      success: true,
      metadata,
      optimizedUrl: this.config.cdnBaseUrl
        ? `${this.config.cdnBaseUrl}/${metadata.id}`
        : undefined,
    };
  }

  async convertImage(
    input: Buffer | string,
    format: 'jpeg' | 'png' | 'webp',
    options?: ImageProcessingOptions
  ): Promise<MediaProcessingResult> {
    const buffer = await this.getBuffer(input);
    const metadata = this.extractMetadata(buffer, 'image');

    // Conversion logic would go here
    return {
      success: true,
      metadata: {
        ...metadata,
        mimeType: `image/${format}`,
        format,
      },
    };
  }

  // Video processing
  async processVideo(
    input: Buffer | string,
    options: VideoProcessingOptions = {}
  ): Promise<MediaProcessingResult> {
    const buffer = await this.getBuffer(input);
    const metadata = this.extractMetadata(buffer, 'video');

    // Processing logic would go here
    return {
      success: true,
      metadata: {
        ...metadata,
        width: options.maxWidth || metadata.width || 1920,
        height: options.maxHeight || metadata.height || 1080,
        bitrate: options.bitrate ? parseInt(options.bitrate) : metadata.bitrate,
      },
      optimizedUrl: this.config.cdnBaseUrl
        ? `${this.config.cdnBaseUrl}/${metadata.id}`
        : undefined,
    };
  }

  async transcodeVideo(
    input: Buffer | string,
    options: VideoProcessingOptions = {}
  ): Promise<MediaProcessingResult> {
    const buffer = await this.getBuffer(input);
    const metadata = this.extractMetadata(buffer, 'video');

    // Transcoding logic would go here
    return {
      success: true,
      metadata,
      optimizedUrl: this.config.cdnBaseUrl
        ? `${this.config.cdnBaseUrl}/${metadata.id}`
        : undefined,
    };
  }

  async compressVideo(
    input: Buffer | string,
    targetBitrate: string,
    options?: VideoProcessingOptions
  ): Promise<MediaProcessingResult> {
    const buffer = await this.getBuffer(input);
    const metadata = this.extractMetadata(buffer, 'video');

    // Compression logic would go here
    return {
      success: true,
      metadata: {
        ...metadata,
        bitrate: parseInt(targetBitrate),
      },
    };
  }

  async trimVideo(
    input: Buffer | string,
    startTime: number,
    endTime: number,
    options?: VideoProcessingOptions
  ): Promise<MediaProcessingResult> {
    const buffer = await this.getBuffer(input);
    const metadata = this.extractMetadata(buffer, 'video');

    // Trim logic would go here
    return {
      success: true,
      metadata: {
        ...metadata,
        duration: endTime - startTime,
      },
    };
  }

  // Thumbnail generation
  async generateThumbnail(
    input: Buffer | string,
    options: ThumbnailOptions = { width: 400, height: 300 }
  ): Promise<MediaProcessingResult> {
    const buffer = await this.getBuffer(input);
    const metadata = this.extractMetadata(buffer, 'image');

    // Thumbnail generation logic would go here
    return {
      success: true,
      metadata: {
        ...metadata,
        width: options.width,
        height: options.height,
        thumbnailUrl: this.config.cdnBaseUrl
          ? `${this.config.cdnBaseUrl}/${metadata.id}-thumb`
          : undefined,
      },
      thumbnailUrl: this.config.cdnBaseUrl
        ? `${this.config.cdnBaseUrl}/${metadata.id}-thumb`
        : undefined,
    };
  }

  async generateVideoThumbnail(
    input: Buffer | string,
    timeInSeconds: number = 1,
    options?: ThumbnailOptions
  ): Promise<MediaProcessingResult> {
    const buffer = await this.getBuffer(input);
    const metadata = this.extractMetadata(buffer, 'video');

    // Video thumbnail extraction would go here
    return {
      success: true,
      metadata: {
        ...metadata,
        width: options?.width || this.config.thumbnailWidth,
        height: options?.height || this.config.thumbnailHeight,
      },
    };
  }

  // Platform-specific processing
  async processForPlatform(
    input: Buffer | string,
    platform: string,
    type: 'image' | 'video' | 'story' | 'reel'
  ): Promise<MediaProcessingResult> {
    const sizing = PLATFORM_SIZING[platform];
    if (!sizing) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    let targetWidth: number;
    let targetHeight: number;

    switch (type) {
      case 'story':
        targetWidth = sizing.story.width;
        targetHeight = sizing.story.height;
        break;
      case 'reel':
        targetWidth = sizing.reel.width;
        targetHeight = sizing.reel.height;
        break;
      case 'video':
        targetWidth = sizing.video.width;
        targetHeight = sizing.video.height;
        break;
      default:
        targetWidth = sizing.image.width;
        targetHeight = sizing.image.height;
    }

    const buffer = await this.getBuffer(input);
    const metadata = this.extractMetadata(buffer, type === 'video' ? 'video' : 'image');

    // Platform-specific processing would go here
    return {
      success: true,
      metadata: {
        ...metadata,
        width: targetWidth,
        height: targetHeight,
      },
    };
  }

  // CDN upload
  async uploadToCDN(
    input: Buffer | string,
    options?: {
      path?: string;
      contentType?: string;
      cacheControl?: string;
    }
  ): Promise<{ url: string; key: string }> {
    if (!this.config.cdnBaseUrl) {
      throw new Error('CDN base URL not configured');
    }

    const buffer = await this.getBuffer(input);
    const key = options?.path || `${crypto.randomUUID()}`;
    const url = `${this.config.cdnBaseUrl}/${key}`;

    // CDN upload logic would go here
    // In a real implementation, this would upload to S3, Cloudflare R2, etc.

    return { url, key };
  }

  // Helper methods
  private async getBuffer(input: Buffer | string): Promise<Buffer> {
    if (Buffer.isBuffer(input)) {
      return input;
    }

    // If it's a URL, fetch it
    if (input.startsWith('http://') || input.startsWith('https://')) {
      const response = await fetch(input);
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    // If it's a file path, read it
    // This would use fs.readFile in a real implementation
    throw new Error('File path reading not implemented in this context');
  }

  private extractMetadata(buffer: Buffer, type: 'image' | 'video'): MediaMetadata {
    const id = crypto.randomUUID();

    // Basic metadata extraction
    // In a real implementation, you would parse the file headers
    return {
      id,
      originalName: `${id}.${type === 'image' ? 'jpg' : 'mp4'}`,
      mimeType: type === 'image' ? 'image/jpeg' : 'video/mp4',
      size: buffer.length,
      width: type === 'image' ? 1920 : 1920,
      height: type === 'image' ? 1080 : 1080,
      duration: type === 'video' ? 30 : undefined,
      bitrate: type === 'video' ? 5000000 : undefined,
      format: type === 'image' ? 'jpeg' : 'mp4',
      createdAt: new Date(),
    };
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Batch processing
  async processBatch(
    files: (File | Buffer | string)[],
    options?: {
      platform?: string;
      type?: 'image' | 'video';
      parallel?: boolean;
    }
  ): Promise<MediaProcessingResult[]> {
    if (options?.parallel) {
      return Promise.all(
        files.map((file) =>
          options.type === 'video'
            ? this.processVideo(file)
            : this.processImage(file)
        )
      );
    }

    const results: MediaProcessingResult[] = [];
    for (const file of files) {
      const result =
        options?.type === 'video'
          ? await this.processVideo(file)
          : await this.processImage(file);
      results.push(result);
    }

    return results;
  }

  // Get platform sizing
  getPlatformSizing(platform: string): PlatformSizing | undefined {
    return PLATFORM_SIZING[platform];
  }

  // Get all platform sizings
  getAllPlatformSizings(): Record<string, PlatformSizing> {
    return PLATFORM_SIZING;
  }
}

// Media handler factory
export function createMediaHandler(config?: Partial<MediaConfig>): MediaHandler {
  return new MediaHandler(config);
}

// Default media handler instance
let defaultMediaHandler: MediaHandler | null = null;

export function getDefaultMediaHandler(): MediaHandler {
  if (!defaultMediaHandler) {
    defaultMediaHandler = createMediaHandler();
  }
  return defaultMediaHandler;
}

export function setDefaultMediaHandler(handler: MediaHandler): void {
  defaultMediaHandler = handler;
}
