import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { Event } from '../../entities/event.entity';
import { Participant } from '../../entities/participant.entity';
import { Certificate } from '../../entities/certificate.entity';
import { AdminLog } from '../../entities/admin-log.entity';
import { CertificatesService } from '../certificates/certificates.service';
import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(Participant) private participantRepo: Repository<Participant>,
    @InjectRepository(Certificate) private certRepo: Repository<Certificate>,
    @InjectRepository(AdminLog) private logRepo: Repository<AdminLog>,
    private readonly certService: CertificatesService,
  ) {}

  /** record admin action (non-blocking) */
  async logAction(adminId: number, action: string, details?: any) {
    try {
      const log = this.logRepo.create({ adminId, action, details });
      await this.logRepo.save(log);
    } catch (err) {
      // do not throw — logging failure must not break main flow
      this.logger.warn(`Failed to save admin log: ${err?.message ?? err}`);
    }
  }

  /** Admin dashboard overview (realtime counts) */
  async getOverview() {
    const [users, events, participants, certificates] = await Promise.all([
      this.userRepo.count(),
      this.eventRepo.count(),
      this.participantRepo.count(),
      this.certRepo.count(),
    ]);
    return { users, events, participants, certificates };
  }

  /** List users (pagination) */
  async listUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.userRepo.findAndCount({
      order: { id: 'ASC' },
      skip,
      take: limit,
    });
    return { items, total, page, limit };
  }

  /** Update user role */
  async updateUserRole(adminId: number, userId: number, role: UserRole) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.role = role;
    await this.userRepo.save(user);
    await this.logAction(adminId, 'update_user_role', { userId, role });
    return user;
  }

  /** Toggle user active status (if your entity has different field, adapt here) */
  async toggleUserStatus(adminId: number, userId: number, active: boolean) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    // adapt to actual field name; try `isActive` or `active`
    if ((user as any).isActive === undefined) {
      (user as any).isActive = active;
    } else {
      (user as any).isActive = active;
    }
    await this.userRepo.save(user);
    await this.logAction(adminId, 'toggle_user_status', { userId, active });
    return user;
  }

  /** Clone event (shallow clone) */
  async cloneEvent(adminId: number, eventId: number) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    const clone = this.eventRepo.create({
      ...event,
      id: undefined,
      title: `${event.title} (Copy)`,
    });
    const saved = await this.eventRepo.save(clone);
    await this.logAction(adminId, 'clone_event', { from: eventId, to: saved.id });
    return saved;
  }

  /** Bulk delete events by ids */
  async deleteEvents(adminId: number, ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new InternalServerErrorException('No event ids provided');
    }
    await this.eventRepo.delete(ids);
    await this.logAction(adminId, 'bulk_delete_events', { ids });
    return { deleted: ids.length };
  }

  /** List participants of event (with user relation) */
  async listEventParticipants(eventId: number) {
    return this.participantRepo.find({ where: { eventId }, relations: ['user'] });
  }

  /** Export participants (optionally filter by eventId) into XLSX saved to uploads/exports */
  async exportParticipantsToExcel(eventId?: number): Promise<string> {
    const whereOpt: any = eventId ? { where: { eventId }, relations: ['user', 'event'] } : { relations: ['user', 'event'] };
    const participants = await this.participantRepo.find(whereOpt);

    const data = participants.map((p: any) => ({
      ID: p.id,
      Name: p.user?.name ?? null,
      Email: p.user?.email ?? null,
      Event: p.event?.title ?? null,
      RegisteredAt: p.createdAt ?? null,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');

    const uploadsDir = path.join(process.cwd(), 'uploads', 'exports');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const exportPath = path.join(uploadsDir, `participants-${eventId ?? 'all'}-${Date.now()}.xlsx`);
    XLSX.writeFile(workbook, exportPath);

    await this.logAction(0, 'export_participants', { eventId, file: exportPath });
    return exportPath;
  }

  /** Bulk generate certificates synchronously (calls CertificatesService per participant) */
  async bulkGenerateCertificates(adminId: number, eventId: number) {
    const participants = await this.participantRepo.find({ where: { eventId }, relations: ['user', 'event'] });
    const generated: number[] = [];
    for (const participant of participants) {
      try {
        const cert = await this.certService.generateFromTemplate(participant.id);
        if (cert && (cert as any).id) generated.push((cert as any).id);
      } catch (err) {
        // continue on error for individual participants
        this.logger.warn(`Failed to generate cert for participant ${participant.id}: ${err?.message ?? err}`);
      }
    }
    await this.logAction(adminId, 'bulk_generate_certificates', { eventId, generatedCount: generated.length });
    return { totalGenerated: generated.length, generated };
  }

  /** System runtime stats */
  async getSystemStats() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    return {
      uptime: Math.round(uptime),
      memory: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
      },
      timestamp: new Date(),
    };
  }

  /** Get admin logs paginated */
  async getLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.logRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { items, total, page, limit };
  }
}
