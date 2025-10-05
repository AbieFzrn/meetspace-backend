import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParticipantsService } from './participants.service';
import { ParticipantsController } from './participants.controller';
import { Participant } from '../../entities/participant.entity';
import { Attendance } from '../../entities/attendance.entity';
import { Event } from '../../entities/event.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Participant, Attendance, Event]),
    EmailModule,
  ],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}