import { IsEmail, IsString, MinLength, Matches, IsOptional, IsNotEmpty } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  lastEducation?: string;

  @IsString()
  @MinLength(8)
  @Matches(passwordRegex, {
    message: 'Password must contain at least 8 characters with uppercase, lowercase, number and special character (example: Password123#)',
  })
  password: string;

  @IsString()
  @Match('password', { message: 'Password confirmation does not match' })
  passwordConfirmation: string;
}