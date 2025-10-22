import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { UploadsService } from './uploads.service';
import { Public } from '../../common/decorators/public.decorator';
import { join, normalize } from 'path';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * ✅ Generalized route — bisa akses:
   * /uploads/event-img/:filename
   * /uploads/flyers/:filename
   * /uploads/certificates/:filename
   */
  @Public()
  @Get(':type/:filename')
  async serveFile(
    @Param('type') type: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Validasi tipe folder
    const allowedTypes = ['flyers', 'certificates', 'event-img'];
    if (!allowedTypes.includes(type)) {
      throw new BadRequestException('Invalid file type');
    }

    // Amankan nama file dari path traversal
    const safeFilename = filename.replace(/(\.\.[\/\\])/g, '_');

    // Bangun path file
    const filePath = this.uploadsService.getFilePath(safeFilename, type as any);
    const normalizedPath = normalize(filePath);

    // Pastikan file-nya memang ada
    if (!existsSync(normalizedPath)) {
      throw new NotFoundException('File not found');
    }

    // ✅ Kirim file ke response
    return res.sendFile(normalizedPath, { root: '.' });
  }
}
