import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../../entities/event.entity';
import { Participant } from '../../entities/participant.entity';
import { createObjectCsvStringifier } from 'csv-writer';
import * as XLSX from 'xlsx';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(Participant) private participantRepo: Repository<Participant>,
  ) {}

  /**
   * Export participants of a specific event to CSV
   */
  async exportEventParticipantsCsv(eventId: number) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    const participants = await this.participantRepo.find({
      where: { eventId },
      relations: ['user'],
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'no', title: 'No' },
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'phone', title: 'Phone' },
        { id: 'registeredAt', title: 'Registered At' },
      ],
    });

    const records = participants.map((p, idx) => ({
      no: idx + 1,
      name: p.user?.name ?? '',
      email: p.user?.email ?? '',
      phone: p.user?.phone ?? '',
      registeredAt: p.registeredAt
        ? new Date(p.registeredAt as any).toISOString()
        : '',
    }));

    const header = csvStringifier.getHeaderString();
    const body = csvStringifier.stringifyRecords(records);
    const csv = header + body;
    return Buffer.from(csv, 'utf-8');
  }

  /**
   * Export participants of a specific event to XLSX
   */
  async exportEventParticipantsXlsx(eventId: number) {
    const participants = await this.participantRepo.find({
      where: { eventId },
      relations: ['user'],
    });

    const records = participants.map((p, idx) => ({
      no: idx + 1,
      name: p.user?.name ?? '',
      email: p.user?.email ?? '',
      phone: p.user?.phone ?? '',
      registeredAt: p.registeredAt
        ? new Date(p.registeredAt as any).toISOString()
        : '',
    }));

    const ws = XLSX.utils.json_to_sheet(records);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'participants');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Export all events summary to CSV
   */
  async exportEventsSummaryCsv() {
    const events = await this.eventRepo.find();

    const records = events.map((e) => {
      const eventDate = e.eventDate ? new Date(e.eventDate as any) : null;
      return {
        id: e.id,
        title: e.title,
        eventDate: eventDate ? eventDate.toISOString() : '',
        location: e.location ?? '',
      };
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'id', title: 'ID' },
        { id: 'title', title: 'Title' },
        { id: 'eventDate', title: 'Date' },
        { id: 'location', title: 'Location' },
      ],
    });

    return Buffer.from(
      csvStringifier.getHeaderString() +
        csvStringifier.stringifyRecords(records),
      'utf-8',
    );
  }

  /**
   * Export all events summary to XLSX
   */
  async exportEventsSummaryXlsx() {
    const events = await this.eventRepo.find();

    const records = events.map((e) => {
      const eventDate = e.eventDate ? new Date(e.eventDate as any) : null;
      return {
        id: e.id,
        title: e.title,
        eventDate: eventDate ? eventDate.toISOString() : '',
        location: e.location ?? '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(records);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'events');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
