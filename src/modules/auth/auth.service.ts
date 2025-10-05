import { 
  Injectable, 
  ConflictException, 
  UnauthorizedException, 
  BadRequestException 
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { OtpService } from './services/otp.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OtpType } from '../../entities/otp.entity';
import { UserRole } from '../../entities/user.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private otpService: OtpService,
    private emailService: EmailService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await this.usersService.hashPassword(registerDto.password);

    // Create user
    const user = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      phone: registerDto.phone,
      address: registerDto.address,
      lastEducation: registerDto.lastEducation,
      passwordHash,
      role: UserRole.USER,
      isEmailVerified: false,
    });

    // Generate OTP for email verification
    const otp = await this.otpService.generateOtp(user.id, OtpType.EMAIL_VERIFICATION);

    // Send verification email
    await this.emailService.sendEmailVerification(user.email, user.name, otp);

    return {
      message: 'Registration successful. Please check your email for verification code.',
      email: user.email,
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    // Find user
    const user = await this.usersService.findByEmail(verifyEmailDto.email);
    if (!user) {
      throw new BadRequestException('Invalid email or OTP');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Validate OTP
    const isValidOtp = await this.otpService.validateOtp(
      user.id, 
      verifyEmailDto.otp, 
      OtpType.EMAIL_VERIFICATION
    );

    if (!isValidOtp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Update user verification status
    await this.usersService.updateEmailVerification(user.id, true);

    return {
      message: 'Email verified successfully. You can now login.',
    };
  }

  async login(loginDto: LoginDto) {
    // Find user
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Email not verified. Please verify your email first.');
    }

    // Validate password
    const isValidPassword = await this.usersService.validatePassword(
      loginDto.password, 
      user.passwordHash
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate session token
    const sessionToken = randomBytes(32).toString('hex');
    
    // Update user session
    await this.usersService.updateSessionToken(user.id, sessionToken);

    // Generate JWT tokens
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      sessionToken 
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async logout(userId: number) {
    await this.usersService.clearSession(userId);
    return { message: 'Logout successful' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      // Don't reveal if email exists or not
      return { message: 'If email exists, password reset code has been sent.' };
    }

    // Generate OTP for password reset
    const otp = await this.otpService.generateOtp(user.id, OtpType.PASSWORD_RESET);

    // Send password reset email
    await this.emailService.sendPasswordResetOtp(user.email, user.name, otp);

    return { message: 'Password reset code has been sent to your email.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    // Find user
    const user = await this.usersService.findByEmail(resetPasswordDto.email);
    if (!user) {
      throw new BadRequestException('Invalid email or OTP');
    }

    // Validate OTP
    const isValidOtp = await this.otpService.validateOtp(
      user.id, 
      resetPasswordDto.otp, 
      OtpType.PASSWORD_RESET
    );

    if (!isValidOtp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Hash new password
    const newPasswordHash = await this.usersService.hashPassword(resetPasswordDto.newPassword);

    // Update password
    await this.usersService.updatePassword(user.id, newPasswordHash);

    // Clear all sessions
    await this.usersService.clearSession(user.id);

    return { message: 'Password reset successful. Please login with your new password.' };
  }

  async refreshSession(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Find user and validate session
      const user = await this.usersService.findById(payload.sub);
      if (!user || user.sessionToken !== payload.sessionToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new access token
      const newPayload = { 
        sub: user.id, 
        email: user.email, 
        role: user.role,
        sessionToken: user.sessionToken 
      };

      const accessToken = this.jwtService.sign(newPayload);

      return {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };

    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}