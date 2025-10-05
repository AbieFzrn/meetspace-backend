import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Otp, OtpType } from '../../../entities/otp.entity';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
  ) {}

  async generateOtp(userId: number, type: OtpType): Promise<string> {
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry to 5 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Invalidate previous OTPs of same type
    await this.otpRepository.update(
      { userId, type, used: false },
      { used: true }
    );

    // Create new OTP
    const otp = this.otpRepository.create({
      userId,
      code,
      type,
      expiresAt,
    });

    await this.otpRepository.save(otp);
    return code;
  }

  async validateOtp(userId: number, code: string, type: OtpType): Promise<boolean> {
    const otp = await this.otpRepository.findOne({
      where: {
        userId,
        code,
        type,
        used: false,
      },
    });

    if (!otp) {
      return false;
    }

    // Check if expired
    if (otp.expiresAt < new Date()) {
      return false;
    }

    // Mark as used
    await this.otpRepository.update(otp.id, { used: true });
    return true;
  }

  async cleanupExpiredOtps(): Promise<void> {
    await this.otpRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}