import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendEmailVerification(
    email: string,
    name: string,
    otp: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        from:
          this.configService.get<string>('MAIL_FROM') ||
          '"Event Management" <no-reply@example.com>',
        subject: 'Verify Your Email - Event Management System',
        template: './email-verification',
        context: {
          name,
          otp,
          expiresInMinutes: 5,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send email verification to ${email}`, error.stack);
      throw error;
    }
  }

  async sendPasswordResetOtp(
    email: string,
    name: string,
    otp: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        from:
          this.configService.get<string>('MAIL_FROM') ||
          '"Event Management" <no-reply@example.com>',
        subject: 'Reset Your Password - Event Management System',
        template: './password-reset',
        context: {
          name,
          otp,
          expiresInMinutes: 5,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send password reset OTP to ${email}`, error.stack);
      throw error;
    }
  }

  async sendEventRegistrationToken(
    email: string,
    name: string,
    eventTitle: string,
    token: string,
    eventDate: string,
    eventTime: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        from:
          this.configService.get<string>('MAIL_FROM') ||
          '"Event Management" <no-reply@example.com>',
        subject: `Registration Confirmed - ${eventTitle}`,
        template: './event-registration',
        context: {
          name,
          eventTitle,
          token,
          eventDate,
          eventTime,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send event registration token to ${email}`, error.stack);
      throw error;
    }
  }
}
