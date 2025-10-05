import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsTimeString } from 'src/common/validators/is-time-string.decorator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  eventDate: string;

  @IsTimeString({ message: 'Start time must be in HH:mm format' })
  startTime: string;

  @IsTimeString({ message: 'End time must be in HH:mm format' })
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  maxParticipants?: number = 0;
}
