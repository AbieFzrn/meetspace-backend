import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificateTemplate } from '../../../entities/certificate-template.entity';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(CertificateTemplate)
    private tplRepo: Repository<CertificateTemplate>,
    private config: ConfigService,
  ) {}

  private getUploadBase(): string {
    return this.config.get<string>('UPLOAD_PATH') || this.config.get<string>('upload.path') || './uploads';
  }

  async createTemplate(name: string, uploadedRelativePath: string, type: 'html' | 'image' | 'pdf' = 'html') {
    try {
      const latest = await this.tplRepo.findOne({ where: { name }, order: { version: 'DESC' } });
      const version = latest ? latest.version + 1 : 1;

      const tpl = this.tplRepo.create({
        name,
        filePath: uploadedRelativePath,
        type,
        version,
      });

      return this.tplRepo.save(tpl);
    } catch (e) {
      throw new InternalServerErrorException('Failed to create template record');
    }
  }

  async listTemplates() {
    return this.tplRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getTemplateById(id: number) {
    return this.tplRepo.findOne({ where: { id } });
  }

  async deleteTemplate(id: number) {
    const tpl = await this.getTemplateById(id);
    if (!tpl) throw new NotFoundException('Template not found');
    const full = join(this.getUploadBase(), tpl.filePath);
    try {
      if (fs.existsSync(full)) fs.unlinkSync(full);
    } catch (e) {
      // ignore delete errors but log in production
    }
    await this.tplRepo.delete({ id });
    return tpl;
  }
}
