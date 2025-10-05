import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { CertificatesService } from '../certificates.service';

@Injectable()
@Processor('certificates')
export class CertificatesProcessor {
  private readonly logger = new Logger(CertificatesProcessor.name);

  constructor(private readonly certificatesService: CertificatesService) {}

  @Process('bulk-generate')
  async handleBulkGenerate(job: Job<{ eventId: number; templateId?: number; participants: number[] }>) {
    const { eventId, templateId, participants } = job.data;
    this.logger.log(`Bulk certificate job started. event=${eventId} total=${participants.length}`);

    for (const pid of participants) {
      try {
        await this.certificatesService.generateFromTemplate(pid, templateId);
      } catch (err) {
        this.logger.error(`Failed to generate certificate for participant ${pid}: ${err.message || err}`);
      }
    }

    this.logger.log('Bulk certificate job finished');
    return { success: true };
  }
}
