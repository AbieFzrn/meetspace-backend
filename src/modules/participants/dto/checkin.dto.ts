import { IsString, Length, IsInt, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';

export class CheckinDto {
  @IsInt()
  @IsPositive()
  @Transform(({ value }) => parseInt(value))
  eventId: number;

  @IsString()
  @Length(10, 10)
  token: string;
}