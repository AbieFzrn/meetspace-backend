import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { MailerModule, MailerOptions } from '@nestjs-modules/mailer';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';

// Config imports
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';
import uploadConfig from './config/upload.config';

// Entity imports
import { User } from './entities/user.entity';
import { Event } from './entities/event.entity';
import { Participant } from './entities/participant.entity';
import { Attendance } from './entities/attendance.entity';
import { Certificate } from './entities/certificate.entity';
import { Otp } from './entities/otp.entity';

// Module imports
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EmailModule } from './modules/email/email.module';

// Guards and Interceptors
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { SessionActivityInterceptor } from './common/interceptors/session-activity.interceptor';
import { EventsModule } from './modules/events/events.module';
import { ParticipantsModule } from './modules/participants/participants.module';
import { UploadsModule } from './modules/uploads/uploads.module';

import { AdminModule } from './modules/admin/admin.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, mailConfig, uploadConfig],
      envFilePath: '.env',
    }),

    //import modules
    EventsModule,
    ParticipantsModule,
    UploadsModule,
    AdminModule,
    ReportsModule,
    CertificatesModule,

    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    CertificatesModule,

    // Scheduler
    ScheduleModule.forRoot(),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
        entities: [User, Event, Participant, Attendance, Certificate, Otp],
      }),
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [
          {
            ttl: parseInt(configService.get<string>('THROTTLE_TTL') ?? '60000', 10),
            limit: parseInt(configService.get<string>('THROTTLE_LIMIT') ?? '10', 10),
          },
        ],
      }),
      inject: [ConfigService],
    }),



    // Mailer
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): MailerOptions => {
        const mailConfig = configService.get<MailerOptions>('mail');
        if (!mailConfig) {
          throw new Error('Mail configuration is missing in environment variables');
        }
        return mailConfig;
      },
      inject: [ConfigService],
    }),

    // File Upload
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const uploadConfig = configService.get('upload');
        return {
          dest: uploadConfig.path,
          limits: {
            fileSize: uploadConfig.maxFileSize,
          },
        };
      },
      inject: [ConfigService],
    }),

    // Feature Modules
    AuthModule,
    UsersModule,
    EmailModule,
  ],
  controllers: [],
  providers: [
    // Global guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: SessionActivityInterceptor,
    },
  ],
})
export class AppModule { }