import {
  Controller,
  UseGuards,
  Get,
  Res,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CertificatesService } from './certificates.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { Response } from 'express';
import * as fs from 'fs';

@Controller('certificates')
@UseGuards(JwtAuthGuard)
export class CertificatesUserController {
  constructor(private readonly certificatesService: CertificatesService) {}

  /** 🔹 List sertifikat milik user login */
  @Get('my')
  async my(@CurrentUser() user: any) {
    return this.certificatesService.listCertificatesForUser(user.id);
  } 

  /** 🔹 Download sertifikat user sendiri */
  @Get(':id/download')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const cert = await this.certificatesService.getCertificateById(id);
    if (!cert) return res.status(404).json({ message: 'Not found' });
    if (cert.userId !== user.id)
      return res.status(403).json({ message: 'Forbidden' });

    const file = this.certificatesService.getCertificateFilePath(cert);
    if (!fs.existsSync(file))
      return res.status(404).json({ message: 'File missing' });

    return res.download(file, `certificate-${cert.id}.pdf`);
  }
}
