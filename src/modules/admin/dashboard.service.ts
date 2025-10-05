import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../../entities/event.entity';
import { Attendance } from '../../entities/attendance.entity';
import { Participant } from '../../entities/participant.entity';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(Participant) private participantRepo: Repository<Participant>,
    @InjectRepository(Attendance) private attendanceRepo: Repository<Attendance>,
  ) {}

  // Events per month (Jan..Dec): return array length 12 with counts
  async getEventsPerMonth(year: number) {
    const raw = await this.eventRepo
      .createQueryBuilder('e')
      .select("MONTH(e.eventDate)", 'month')
      .addSelect('COUNT(e.id)', 'count')
      .where('YEAR(e.eventDate) = :year', { year })
      .groupBy('MONTH(e.eventDate)')
      .orderBy('MONTH(e.eventDate)', 'ASC')
      .getRawMany();

    const result = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: 0,
    }));
    raw.forEach((r: any) => {
      const m = parseInt(r.month, 10);
      result[m - 1].count = parseInt(r.count, 10);
    });
    return result;
  }

  // Participants per month (based on attendances that are verified)
  async getParticipantsPerMonth(year: number) {
    const raw = await this.attendanceRepo
      .createQueryBuilder('a')
      .select("MONTH(a.created_at)", 'month')
      .addSelect('COUNT(DISTINCT a.participant_id)', 'count')
      .where('YEAR(a.created_at) = :year', { year })
      .andWhere('a.verified = true')
      .groupBy('MONTH(a.created_at)')
      .orderBy('MONTH(a.created_at)', 'ASC')
      .getRawMany();

    const result = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: 0,
    }));
    raw.forEach((r: any) => {
      const m = parseInt(r.month, 10);
      result[m - 1].count = parseInt(r.count, 10);
    });
    return result;
  }

  // Top events by attendance
  async getTopEvents(limit = 10) {
    const raw = await this.eventRepo
      .createQueryBuilder('e')
      .leftJoin('attendances', 'a', 'a.event_id = e.id AND a.verified = true')
      .select('e.id', 'id')
      .addSelect('e.title', 'title')
      .addSelect('COUNT(a.id)', 'attendees')
      .groupBy('e.id')
      .orderBy('attendees', 'DESC')
      .limit(limit)
      .getRawMany();

    return raw.map(r => ({
      id: parseInt(r.id, 10),
      title: r.title,
      attendees: parseInt(r.attendees, 10),
    }));
  }
}
