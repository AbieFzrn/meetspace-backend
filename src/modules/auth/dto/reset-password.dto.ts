import { IsEmail, IsString, Length, MinLength, Matches } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;

  @IsString()
  @MinLength(8)
  @Matches(passwordRegex, {
    message: 'Password must contain at least 8 characters with uppercase, lowercase, number and special character',
  })
  newPassword: string;

  @IsString()
  @Match('newPassword', { message: 'Password confirmation does not match' })
  passwordConfirmation: string;
}