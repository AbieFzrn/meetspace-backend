import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from '../../entities/participant.entity';
import { Event } from '../../entities/event.entity';
import { Certificate } from '../../entities/certificate.entity';
import { CertificateTemplate } from '../../entities/certificate-template.entity';
import PDFDocument from 'pdfkit';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Participant)
    private participantRepo: Repository<Participant>,
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
    @InjectRepository(Certificate)
    private certRepo: Repository<Certificate>,
    @InjectRepository(CertificateTemplate)
    private tplRepo: Repository<CertificateTemplate>,
    private config: ConfigService,
  ) {}

  private getUploadBase(): string {
    return this.config.get<string>('upload.path') || './uploads';
  }

  /** 🔹 Public helper untuk controller */
  public getCertificateFilePath(cert: Certificate): string {
    return join(this.getUploadBase(), cert.certificatePath);
  }

  async getCertificateById(id: number) {
    return this.certRepo.findOne({ where: { id } });
  }

  async listCertificatesForUser(userId: number) {
    return this.certRepo.find({
      where: { userId },
      order: { issuedAt: 'DESC' },
    });
  }

  /** 🔹 Simple fallback PDF pakai pdfkit */
  private async generatePdfFallback(
    outAbs: string,
    ctx: { name: string; event_title: string; date: string },
  ) {
    const dir = join(outAbs, '..');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
    const stream = fs.createWriteStream(outAbs);
    doc.pipe(stream);

    doc.fontSize(30).text('Certificate of Participation', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(22).text(ctx.name, { align: 'center' });
    doc.moveDown(1);
    doc
      .fontSize(16)
      .text(`For participating in "${ctx.event_title}"`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12).text(`Date: ${ctx.date}`, { align: 'center' });

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', (err) => reject(err));
    });
  }

  /** 🔹 Render template HTML → PDF pakai puppeteer */
  private async renderTemplateToPdf(
    templateAbsPath: string,
    context: any,
    outAbsPath: string,
  ) {
    if (!fs.existsSync(templateAbsPath)) {
      throw new InternalServerErrorException(
        'Template not found: ' + templateAbsPath,
      );
    }
    const tplStr = await fs.promises.readFile(templateAbsPath, 'utf8');
    const html = Handlebars.compile(tplStr)(context);

    const outDir = join(outAbsPath, '..');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const launchOptions: puppeteer.LaunchOptions = {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    };

    let browser: puppeteer.Browser | null = null;
    try {
      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
      });
      await fs.promises.writeFile(outAbsPath, pdfBuffer);
    } catch (err) {
      // fallback ke pdfkit
      await this.generatePdfFallback(outAbsPath, {
        name: context.name,
        event_title: context.event_title,
        date: context.date,
      });
    } finally {
      if (browser) await browser.close();
    }
  }

  /** 🔹 Generate certificate pakai template kalau ada, fallback pdfkit kalau tidak */
  async generateFromTemplate(participantId: number, templateId?: number) {
    const participant = await this.participantRepo.findOne({
      where: { id: participantId },
      relations: ['user', 'event'],
    });
    if (!participant) throw new NotFoundException('Participant not found');

    const user = participant.user;
    const event = participant.event;

    // Pilih template
    let template: CertificateTemplate | null = null;
    if (templateId) {
      template = await this.tplRepo.findOne({ where: { id: templateId } });
      if (!template) throw new NotFoundException('Template not found');
    } else {
      template = await this.tplRepo.findOne({
        order: { createdAt: 'DESC' },
      });
    }

    const filename = `certificate-${event.id}-${user.id}-${Date.now()}.pdf`;
    const relativeOut = join('certificates', 'output', filename);
    const outAbs = join(this.getUploadBase(), relativeOut);

    const ctx = {
      name: user.name,
      event_title: event.title,
      date: event.eventDate
        ? new Date(event.eventDate).toISOString().split('T')[0]
        : '',
      registration_token:
        (participant as any).registrationToken ??
        (participant as any).registration_token ??
        '',
    };

    if (template && template.type === 'html') {
      const tplAbs = join(this.getUploadBase(), template.filePath);
      await this.renderTemplateToPdf(tplAbs, ctx, outAbs);
    } else {
      await this.generatePdfFallback(outAbs, ctx);
    }

    // Simpan record di DB
    const cert = this.certRepo.create({
      userId: user.id,
      eventId: event.id,
      certificatePath: relativeOut,
      issuedAt: new Date(),
    });

    return this.certRepo.save(cert);
  }
}
