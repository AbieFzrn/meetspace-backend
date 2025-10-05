import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityNotFoundError, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { Participant } from '../../entities/participant.entity';
import { Attendance } from '../../entities/attendance.entity';
import { Event } from '../../entities/event.entity';
import { EmailService } from '../email/email.service';
import { CheckinDto } from './dto/checkin.dto';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(Participant)
    private participantsRepository: Repository<Participant>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    private emailService: EmailService,
  ) {}

  // 🔹 Helper untuk konsistensi
  private async getOneOrException<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    notFoundMessage: string,
  ): Promise<T> {
    try {
      return await qb.getOneOrFail();
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new NotFoundException(notFoundMessage);
      }
      throw error;
    }
  }

  private generateToken(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  async registerForEvent(
    eventId: number,
    userId: number,
  ): Promise<{ message: string; token: string }> {
    // cek event
    let event: Event;
    try {
      event = await this.eventsRepository.findOneOrFail({
        where: { id: eventId },
        relations: ['createdBy'],
      });
    } catch (e) {
      throw new NotFoundException('Event not found');
    }

    const now = new Date();
    if (now >= new Date(event.registrationDeadline)) {
      throw new BadRequestException('Registration for this event has closed');
    }

    // cek sudah terdaftar
    const existingParticipant = await this.participantsRepository.findOne({
      where: { eventId, userId },
    });
    if (existingParticipant) {
      throw new ConflictException('You are already registered for this event');
    }

    // cek max participants
    if (event.maxParticipants > 0) {
      const currentParticipants = await this.participantsRepository.count({
        where: { eventId },
      });
      if (currentParticipants >= event.maxParticipants) {
        throw new BadRequestException(
          'Event has reached maximum participants',
        );
      }
    }

    // generate token unik
    let token: string;
    let tokenExists = true;
    do {
      token = this.generateToken();
      tokenExists = !!(await this.participantsRepository.findOne({
        where: { registrationToken: token },
      }));
    } while (tokenExists);

    const participant = this.participantsRepository.create({
      userId,
      eventId,
      registrationToken: token,
      tokenSentAt: now,
    });
    await this.participantsRepository.save(participant);

    // ambil user dengan helper
    const participantWithUser = await this.getOneOrException(
      this.participantsRepository
        .createQueryBuilder('participant')
        .leftJoinAndSelect('participant.user', 'user')
        .where('participant.id = :id', { id: participant.id }),
      'Participant not found',
    );

    await this.emailService.sendEventRegistrationToken(
      participantWithUser.user.email,
      participantWithUser.user.name,
      event.title,
      token,
      event.eventDate,
      event.startTime,
    );

    return {
      message:
        'Successfully registered for event. Check your email for attendance token.',
      token, // ⚠️ testing only
    };
  }

  async checkin(
    checkinDto: CheckinDto,
    userId: number,
  ): Promise<{ message: string }> {
    const { eventId, token } = checkinDto;

    let participant: Participant;
    try {
      participant = await this.participantsRepository.findOneOrFail({
        where: { eventId, registrationToken: token, userId },
        relations: ['event', 'user'],
      });
    } catch {
      throw new BadRequestException(
        'Invalid token or you are not registered for this event',
      );
    }

    const event = participant.event;
    const now = new Date();
    const eventDateTime = new Date(`${event.eventDate} ${event.startTime}`);

    if (now < eventDateTime) {
      throw new BadRequestException(
        'Check-in is only available after the event starts',
      );
    }

    const existingAttendance = await this.attendanceRepository.findOne({
      where: { participantId: participant.id },
    });
    if (existingAttendance) {
      throw new BadRequestException('You have already checked in for this event');
    }

    const attendance = this.attendanceRepository.create({
      participantId: participant.id,
      eventId,
      verified: true,
    });
    await this.attendanceRepository.save(attendance);

    return {
      message: 'Successfully checked in. You are now eligible for certificate.',
    };
  }

  async getUserEventHistory(userId: number) {
    const participants = await this.participantsRepository.find({
      where: { userId },
      relations: ['event', 'attendance'],
      order: { registeredAt: 'DESC' },
    });

    return participants.map((participant) => ({
      id: participant.id,
      event: {
        id: participant.event.id,
        title: participant.event.title,
        eventDate: participant.event.eventDate,
        startTime: participant.event.startTime,
        location: participant.event.location,
      },
      registeredAt: participant.registeredAt,
      hasAttended: !!participant.attendance,
      attendedAt: participant.attendance?.attendedAt || null,
      canCheckin: this.canCheckinToEvent(participant.event),
    }));
  }

  private canCheckinToEvent(event: Event): boolean {
    const now = new Date();
    const eventDateTime = new Date(`${event.eventDate} ${event.startTime}`);
    return now >= eventDateTime;
  }

  async findByUserAndEvent(userId: number, eventId: number): Promise<Participant> {
    try {
      return await this.participantsRepository.findOneOrFail({
        where: { userId, eventId },
        relations: ['attendance'],
      });
    } catch {
      throw new NotFoundException('Participant not found');
    }
  }
}
