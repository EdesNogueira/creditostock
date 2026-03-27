import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get('STORAGE_BUCKET', 'creditostock');
    this.s3 = new S3Client({
      endpoint: config.get('STORAGE_ENDPOINT', 'http://localhost:9000'),
      region: config.get('STORAGE_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.get('STORAGE_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: config.get('STORAGE_SECRET_KEY', 'minioadmin'),
      },
      forcePathStyle: true,
    });
  }

  async upload(key: string, body: Buffer | Readable, contentType: string): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  buildKey(folder: string, filename: string): string {
    const ts = Date.now();
    return `${folder}/${ts}-${filename}`;
  }
}
