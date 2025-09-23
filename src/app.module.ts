import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { MailerModule, MailerOptions } from '@nestjs-modules/mailer';
import { MulterModule } from '@nestjs/platform-express';

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

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, mailConfig, uploadConfig],
      envFilePath: '.env',
    }),

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }