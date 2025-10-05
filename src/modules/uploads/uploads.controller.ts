import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { UploadsService } from './uploads.service';
import { Public } from '../../common/decorators/public.decorator';
import { existsSync } from 'fs';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Public()
  @Get('flyers/:filename')
  async serveFlyer(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.uploadsService.getFilePath(filename, 'flyers');
    
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    return res.sendFile(filePath, { root: '.' });
  }

  @Public()
  @Get('certificates/:filename')
  async serveCertificate(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.uploadsService.getFilePath(filename, 'certificates');
    
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    return res.sendFile(filePath, { root: '.' });
  }
}