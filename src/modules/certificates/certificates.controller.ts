import {
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  Res,
  UseGuards,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../entities/user.entity';
import { join } from 'path';
import * as fs from 'fs';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly service: CertificatesService) {}

  /**
   * 🔹 ADMIN: Generate certificate for a participant using optional template
   * POST /api/admin/certificates/generate/:participantId?templateId=123
   */
  @Roles(UserRole.ADMIN)
  @Post('admin/generate/:participantId')
  async generateCertificate(
    @Param('participantId', ParseIntPipe) participantId: number,
    @Query('templateId') templateId?: number,
  ) {
    return this.service.generateFromTemplate(participantId, templateId);
  }

  /**
   * 🔹 ADMIN: Download certificate by certificate ID
   * GET /api/admin/certificates/:id/download
   */
  @Roles(UserRole.ADMIN)
  @Get('admin/:id/download')
  async downloadCertificate(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const cert = await this.service.getCertificateById(id);
    if (!cert) {
      throw new NotFoundException('Certificate not found');
    }

    const filePath = join('./uploads', cert.certificatePath);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on server');
    }

    res.download(filePath, `certificate-${cert.id}.pdf`);
  }

  /**
   * 🔹 USER: Get all certificates for current logged-in user
   * GET /api/certificates/my
   */
  @Get('my')
  async getMyCertificates(@CurrentUser() user: User) {
    return this.service.listCertificatesForUser(user.id);
  }

  /**
   * 🔹 ADMIN: List certificates by userId
   * GET /api/admin/certificates/user/:userId
   */
  @Roles(UserRole.ADMIN)
  @Get('admin/user/:userId')
  async getCertificatesByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.listCertificatesForUser(userId);
  }
}
