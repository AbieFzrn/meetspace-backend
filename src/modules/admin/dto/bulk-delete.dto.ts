import { IsArray, ArrayNotEmpty, IsInt } from 'class-validator';

export class BulkDeleteDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];
}
