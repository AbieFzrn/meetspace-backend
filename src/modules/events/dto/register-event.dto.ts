import { IsInt, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterEventDto {
  @IsInt()
  @IsPositive()
  @Transform(({ value }) => parseInt(value))
  eventId: number;
}