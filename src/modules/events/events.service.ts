import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Event } from '../../entities/event.entity';
import { Participant } from '../../entities/participant.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SearchEventsDto, SortBy, SortOrder } from './dto/search-events.dto';
import { UploadsService } from '../uploads/uploads.service';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,

    @InjectRepository(Participant)
    private participantsRepository: Repository<Participant>,

    private readonly uploadsService: UploadsService,
  ) { }

  // ===========================
  // 🏗️ CREATE EVENT
  // ===========================
  async create(createEventDto: CreateEventDto, adminId: number): Promise<Event> {
    const eventDate = new Date(createEventDto.eventDate);
    const now = new Date();
    const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 3) {
      throw new BadRequestException(
        'Event must be created at least 3 days before the event date (H-3 rule)',
      );
    }

    const registrationDeadline = new Date(`${createEventDto.eventDate} ${createEventDto.startTime}`);

    const event = this.eventsRepository.create({
      ...createEventDto,
      createdById: adminId,
      registrationDeadline,
    });

    return this.eventsRepository.save(event);
  }

  // ===========================
  // 🖼️ UPDATE EVENT IMAGE
  // ===========================
  async updateImagePath(eventId: number, filename: string, adminId: number): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    // Hapus gambar lama (kalau ada)
    if (event.imagePath) {
      try {
        const oldFilename = event.imagePath.split('/').pop();
        if (oldFilename) this.uploadsService.deleteFile(oldFilename, 'event-img');
      } catch (e) {
        console.warn('⚠️ Failed to delete old image:', e.message);
      }
    }

    // Simpan path baru (bukan buffer)
    await this.eventsRepository.update(eventId, {
      imagePath: `/uploads/event-img/${filename}`,
    });

    // Ambil ulang data supaya `updated_at` terbaru ikut ke-return
    return this.findOne(eventId);
  }

  // ===========================
  // 🔍 FIND ALL (Advanced Filtering)
  // ===========================
  async findAll(searchDto: SearchEventsDto) {
    const {
      search,
      sortBy = SortBy.DATE,
      sortOrder = SortOrder.ASC,
      page = 1,
      limit = 10,
      startDate,
      endDate,
      location,
      freeOnly,
      hasCertificate,
    } = searchDto;

    const queryBuilder = this.eventsRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.createdBy', 'admin')
      .select([
        'event.id',
        'event.title',
        'event.description',
        'event.imagePath',
        'event.eventDate',
        'event.startTime',
        'event.endTime',
        'event.location',
        'event.registrationDeadline',
        'event.createdAt',
        'event.updatedAt',
        'admin.id',
        'admin.name',
      ]);

    // 🔍 Keyword search
    if (search) {
      queryBuilder.andWhere(
        '(event.title LIKE :search OR event.description LIKE :search OR event.location LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 🗓️ Date range filter
    if (startDate && endDate) {
      queryBuilder.andWhere('event.eventDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('event.eventDate >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('event.eventDate <= :endDate', { endDate });
    }

    // 📍 Filter by location
    if (location) {
      queryBuilder.andWhere('event.location LIKE :location', { location: `%${location}%` });
    }

    // 🎓 Filter events that have certificate templates
    if (hasCertificate) {
      queryBuilder.andWhere('event.certificateTemplatePath IS NOT NULL');
    }

    // 💸 Filter only free events
    if (freeOnly) {
      queryBuilder.andWhere('(event.price IS NULL OR event.price = 0)');
    }

    // 🏆 Sorting logic
    if (sortBy === SortBy.TOP) {
      // Special handling for TOP sort to avoid DISTINCT issues
      queryBuilder.addSelect(
        `(SELECT COUNT(*) FROM participants p WHERE p.event_id = event.id)`,
        'participantCount',
      );

      queryBuilder.orderBy('participantCount', 'DESC');
      queryBuilder.addOrderBy('event.id', 'ASC'); // Tie breaker for consistent ordering
    } else if (sortBy === SortBy.NEWEST) {
      queryBuilder.orderBy('event.createdAt', 'DESC');
    } else {
      const sortColumn =
        sortBy === SortBy.DATE
          ? 'event.eventDate'
          : sortBy === SortBy.TITLE
            ? 'event.title'
            : 'event.createdAt';

      queryBuilder.orderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');

      if (sortBy === SortBy.DATE) {
        queryBuilder.addOrderBy('event.startTime', sortOrder.toUpperCase() as 'ASC' | 'DESC');
      }
    }

    // 🔢 Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Execute query differently based on sort type
    if (sortBy === SortBy.TOP) {
      // Use getRawAndEntities to get both raw SQL results and mapped entities
      const { entities, raw } = await queryBuilder.getRawAndEntities();

      // Attach participant count to entities
      const eventsWithCount = entities.map((event, index) => ({
        ...event,
        participantCount: parseInt(raw[index]?.participantCount || '0', 10),
      }));

      // Get total count with same filters
      const countQuery = this.eventsRepository
        .createQueryBuilder('event')
        .select('COUNT(event.id)', 'total');

      if (search) {
        countQuery.andWhere(
          '(event.title LIKE :search OR event.description LIKE :search OR event.location LIKE :search)',
          { search: `%${search}%` },
        );
      }
      if (startDate && endDate) {
        countQuery.andWhere('event.eventDate BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      } else if (startDate) {
        countQuery.andWhere('event.eventDate >= :startDate', { startDate });
      } else if (endDate) {
        countQuery.andWhere('event.eventDate <= :endDate', { endDate });
      }
      if (location) {
        countQuery.andWhere('event.location LIKE :location', { location: `%${location}%` });
      }
      if (hasCertificate) {
        countQuery.andWhere('event.certificateTemplatePath IS NOT NULL');
      }
      if (freeOnly) {
        countQuery.andWhere('(event.price IS NULL OR event.price = 0)');
      }

      const { total } = await countQuery.getRawOne();

      return {
        data: eventsWithCount,
        pagination: {
          page,
          limit,
          total: parseInt(total, 10),
          totalPages: Math.ceil(parseInt(total, 10) / limit),
        },
      };
    } else {
      // For other sorts, use standard approach with loadRelationCountAndMap
      queryBuilder.loadRelationCountAndMap('event.participantCount', 'event.participants');

      const [events, total] = await queryBuilder.getManyAndCount();

      return {
        data: events,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }
  }



  async findPublicEvents(searchDto: SearchEventsDto) {
    const now = new Date();
    const result = await this.findAll(searchDto);
    result.data = result.data.filter((event) => new Date(event.registrationDeadline) > now);
    return result;
  }

  async findOne(id: number): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'participants', 'participants.user'],
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async findOnePublic(id: number): Promise<Event> {
    const event = await this.findOne(id);
    const now = new Date();
    if (new Date(event.registrationDeadline) <= now) {
      throw new BadRequestException('Registration for this event has closed');
    }
    return event;
  }

  async update(id: number, updateEventDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if (updateEventDto.eventDate) {
      const eventDate = new Date(updateEventDto.eventDate);
      const now = new Date();
      const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 3) {
        throw new BadRequestException('Event date must be at least 3 days from now (H-3 rule)');
      }

      const startTime = updateEventDto.startTime || event.startTime;
      updateEventDto['registrationDeadline'] = new Date(`${updateEventDto.eventDate} ${startTime}`);
    } else if (updateEventDto.startTime) {
      updateEventDto['registrationDeadline'] = new Date(
        `${event.eventDate} ${updateEventDto.startTime}`,
      );
    }

    await this.eventsRepository.update(id, updateEventDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const event = await this.findOne(id);
    await this.eventsRepository.delete(event.id);
  }

  async updateFlyer(eventId: number, filename: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });
    if (!event) throw new BadRequestException('Event not found');

    // 🧹 Hapus file lama jika ada
    if (event.flyerPath) {
      const oldFile = event.flyerPath.split('/').pop();
      if (oldFile) this.uploadsService.deleteFile(oldFile, 'flyers');
    }

    // 💾 Update flyer path (MySQL otomatis update `updated_at`)
    await this.eventsRepository.update(eventId, {
      flyerPath: `/uploads/flyers/${filename}`,
    });

    // 🔁 Return event dengan data terbaru (termasuk updated_at)
    return this.findOne(eventId);
  }

  async updateCertificateTemplate(eventId: number, filename: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({ where: { id: eventId } });
    if (!event) throw new BadRequestException('Event not found');

    // 🧹 Hapus file lama jika ada
    if (event.certificateTemplatePath) {
      const oldFile = event.certificateTemplatePath.split('/').pop();
      if (oldFile) this.uploadsService.deleteFile(oldFile, 'certificates');
    }

    // 💾 Update certificate path (MySQL otomatis update `updated_at`)
    await this.eventsRepository.update(eventId, {
      certificateTemplatePath: `/uploads/certificates/${filename}`,
    });

    // 🔁 Return event terbaru
    return this.findOne(eventId);
  }


  async getEventParticipants(eventId: number) {
    const event = await this.findOne(eventId);
    const participants = await this.participantsRepository.find({
      where: { eventId },
      relations: ['user', 'attendance'],
      order: { registeredAt: 'DESC' },
    });

    return participants.map((participant) => ({
      id: participant.id,
      user: {
        id: participant.user.id,
        name: participant.user.name,
        email: participant.user.email,
        phone: participant.user.phone,
        address: participant.user.address,
        lastEducation: participant.user.lastEducation,
      },
      registeredAt: participant.registeredAt,
      hasAttended: !!participant.attendance,
      attendedAt: participant.attendance?.attendedAt || null,
    }));
  }

  async getUpcomingEvents(): Promise<Event[]> {
    const now = new Date();
    return this.eventsRepository.find({
      where: { eventDate: MoreThanOrEqual(now.toISOString().split('T')[0]) },
      order: { eventDate: 'ASC', startTime: 'ASC' },
      take: 5,
    });
  }

  async checkRegistrationStatus(eventId: number, userId: number): Promise<boolean> {
    const participant = await this.participantsRepository.findOne({
      where: { eventId, userId },
    });
    return !!participant;
  }
}
