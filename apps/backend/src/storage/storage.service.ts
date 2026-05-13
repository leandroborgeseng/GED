import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private client: S3Client | null = null;
  private bucket: string | null = null;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const region = this.config.get<string>('S3_REGION', 'us-east-1');
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY');
    const secretAccessKey = this.config.get<string>('S3_SECRET_KEY');
    this.bucket = this.config.get<string>('S3_BUCKET') ?? null;
    if (endpoint && accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region,
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
      });
    }
  }

  async status(): Promise<{ configured: boolean; bucketOk?: boolean }> {
    if (!this.client || !this.bucket) return { configured: false };
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return { configured: true, bucketOk: true };
    } catch {
      return { configured: true, bucketOk: false };
    }
  }

  async getObjectKey(_key: string): Promise<Buffer | null> {
    if (!this.client || !this.bucket) return null;
    return null;
  }
}
