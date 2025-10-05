import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../../entities/user.entity';
import { Event } from '../../entities/event.entity';
import { Participant } from '../../entities/participant.entity';
import { Certificate } from '../../entities/certificate.entity';
import { AdminLog } from '../../entities/admin-log.entity';
import { CertificateTemplate } from '../../entities/certificate-template.entity';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Event, Participant, Certificate, AdminLog, CertificateTemplate]),
    CertificatesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
