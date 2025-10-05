import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadsService {
  constructor(private configService: ConfigService) {}

  private ensureDirectoryExists(dir: string) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  getFilePath(filename: string, type: 'flyers' | 'certificates'): string {
    const uploadPath = this.configService.get<string>('upload.path', './uploads');
    return join(uploadPath, type, filename);
  }

  getFileUrl(filename: string, type: 'flyers' | 'certificates'): string {
    return `/uploads/${type}/${filename}`;
  }

  saveFile(file: Express.Multer.File, type: 'flyers' | 'certificates'): string {
    try {
      const uploadPath = this.configService.get<string>('upload.path', './uploads');
      const destinationDir = join(uploadPath, type);
      
      this.ensureDirectoryExists(destinationDir);

      const filename = `${Date.now()}-${file.originalname}`;
      const destinationPath = join(destinationDir, filename);

      // Move file from temp location to destination
      require('fs').writeFileSync(destinationPath, file.buffer);

      return filename;
    } catch (error) {
      throw new InternalServerErrorException('Failed to save file');
    }
  }

  deleteFile(filename: string, type: 'flyers' | 'certificates'): boolean {
    try {
      const filePath = this.getFilePath(filename, type);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  validateImageFile(file: Express.Multer.File): void {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and GIF images are allowed');
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }
  }

  validateDocumentFile(file: Express.Multer.File): void {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, DOC, and DOCX files are allowed');
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB');
    }
  }
}