import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OtpService } from '../services/otp.service';

@Injectable()
export class CleanupTask {
  private readonly logger = new Logger(CleanupTask.name);

  constructor(private otpService: OtpService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOtps() {
    this.logger.log('Starting cleanup of expired OTPs');
    try {
      await this.otpService.cleanupExpiredOtps();
      this.logger.log('Cleanup completed successfully');
    } catch (error) {
      this.logger.error('Cleanup failed', error);
    }
  }
}