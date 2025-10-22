import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadsService {
  constructor(private configService: ConfigService) {}

  private ensureDirectoryExists(dir: string) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  }

  getFilePath(filename: string, type: 'flyers' | 'certificates' | 'event-img'): string {
    const uploadPath = this.configService.get<string>('upload.path', './uploads');
    return join(uploadPath, type, filename);
  }

  getFileUrl(filename: string, type: 'flyers' | 'certificates' | 'event-img'): string {
    return `/uploads/${type}/${filename}`;
  }

  saveFile(file: Express.Multer.File, type: 'flyers' | 'certificates' | 'event-img'): string {
  try {
    if (!file || !file.filename) {
      throw new BadRequestException('No file uploaded');
    }

    const filename = file.filename;
    return filename;
  } catch (error) {
    console.error('❌ Failed to save file:', error);
    throw new InternalServerErrorException('Failed to save file');
  }
}


  deleteFile(filename: string, type: 'flyers' | 'certificates' | 'event-img'): boolean {
    try {
      const filePath = this.getFilePath(filename, type);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to delete file:', error);
      return false;
    }
  }

  validateImageFile(file: Express.Multer.File): void {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, GIF, and WEBP images are allowed');
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }
  }

  validateDocumentFile(file: Express.Multer.File): void {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, DOC, and DOCX files are allowed');
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB');
    }
  }
}
