import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ParticipantsService } from './participants.service';
import { CheckinDto } from './dto/checkin.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get('history')
  async getUserEventHistory(@CurrentUser('id') userId: number) {
    return this.participantsService.getUserEventHistory(userId);
  }

  @Post('checkin')
  @UseGuards(ThrottlerGuard)
  async checkin(
    @Body() checkinDto: CheckinDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.participantsService.checkin(checkinDto, userId);
  }
}