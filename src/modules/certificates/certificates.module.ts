import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Certificate } from '../../entities/certificate.entity';
import { Participant } from '../../entities/participant.entity';
import { Event } from '../../entities/event.entity';
import { CertificateTemplate } from '../../entities/certificate-template.entity';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { CertificatesUserController } from './certificatesUser.controller';
import { TemplatesService } from './templates/templates.service';
import { TemplatesController } from './templates/templates.controller';
import { CertificatesProcessor } from './jobs/certificates.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Certificate, Participant, Event, CertificateTemplate]),
    BullModule.registerQueue({ name: 'certificates' }),
  ],
  providers: [CertificatesService, TemplatesService, CertificatesProcessor],
  controllers: [CertificatesController, CertificatesUserController, TemplatesController],
  exports: [CertificatesService, TemplatesService],
})
export class CertificatesModule {}
