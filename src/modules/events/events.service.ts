import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, MoreThanOrEqual } from 'typeorm';
import { Event } from '../../entities/event.entity';
import { Participant } from '../../entities/participant.entity';
import { User } from '../../entities/user.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SearchEventsDto, SortBy, SortOrder } from './dto/search-events.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
    @InjectRepository(Participant)
    private participantsRepository: Repository<Participant>,
  ) {}

  async create(createEventDto: CreateEventDto, adminId: number): Promise<Event> {
    // H-3 rule validation
    const eventDate = new Date(createEventDto.eventDate);
    const now = new Date();
    const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 3) {
      throw new BadRequestException(
        'Event must be created at least 3 days before the event date (H-3 rule)'
      );
    }

    // Set registration deadline to event start time
    const registrationDeadline = new Date(`${createEventDto.eventDate} ${createEventDto.startTime}`);

    const event = this.eventsRepository.create({
      ...createEventDto,
      createdById: adminId,
      registrationDeadline,
    });

    return this.eventsRepository.save(event);
  }

  async findAll(searchDto: SearchEventsDto) {
    const {
      search,
      sortBy = SortBy.DATE,
      sortOrder = SortOrder.ASC,
      page = 1,
      limit = 10,
      startDate,
      endDate,
    } = searchDto;

    const queryBuilder = this.eventsRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.createdBy', 'admin')
      .leftJoinAndSelect('event.participants', 'participants')
      .loadRelationCountAndMap('event.participantCount', 'event.participants');

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(event.title LIKE :search OR event.description LIKE :search OR event.location LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Date range filter
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

    // Sorting
    const sortColumn = sortBy === SortBy.DATE ? 'event.eventDate' : 
                      sortBy === SortBy.TITLE ? 'event.title' : 'event.createdAt';
    
    queryBuilder.orderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Add secondary sort by start time for same dates
    if (sortBy === SortBy.DATE) {
      queryBuilder.addOrderBy('event.startTime', sortOrder.toUpperCase() as 'ASC' | 'DESC');
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

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

  async findPublicEvents(searchDto: SearchEventsDto) {
    // Only show events that are still accepting registrations
    const now = new Date();
    
    const result = await this.findAll(searchDto);
    
    // Filter out events past registration deadline
    result.data = result.data.filter(event => 
      new Date(event.registrationDeadline) > now
    );

    return result;
  }

  async findOne(id: number): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'participants', 'participants.user'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async findOnePublic(id: number): Promise<Event> {
    const event = await this.findOne(id);
    
    // Check if registration is still open
    const now = new Date();
    if (new Date(event.registrationDeadline) <= now) {
      throw new BadRequestException('Registration for this event has closed');
    }

    return event;
  }

  async update(
    id: number,
    updateEventDto: UpdateEventDto,
    adminId: number,
  ): Promise<Event> {
    const event = await this.findOne(id);

    // Check if admin owns the event
    if (event.createdById !== adminId) {
      throw new ForbiddenException('You can only update your own events');
    }

    // H-3 rule validation if event date is being updated
    if (updateEventDto.eventDate) {
      const eventDate = new Date(updateEventDto.eventDate);
      const now = new Date();
      const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 3) {
        throw new BadRequestException(
          'Event date must be at least 3 days from now (H-3 rule)'
        );
      }

      // Update registration deadline if event date or time changes
      const startTime = updateEventDto.startTime || event.startTime;
      updateEventDto['registrationDeadline'] = new Date(`${updateEventDto.eventDate} ${startTime}`);
    } else if (updateEventDto.startTime) {
      // Update registration deadline if only start time changes
      updateEventDto['registrationDeadline'] = new Date(`${event.eventDate} ${updateEventDto.startTime}`);
    }

    await this.eventsRepository.update(id, updateEventDto);
    return this.findOne(id);
  }

  async remove(id: number, adminId: number): Promise<void> {
    const event = await this.findOne(id);

    // Check if admin owns the event
    if (event.createdById !== adminId) {
      throw new ForbiddenException('You can only delete your own events');
    }

    await this.eventsRepository.delete(id);
  }

  async updateFlyer(id: number, flyerPath: string, adminId: number): Promise<Event> {
    const event = await this.findOne(id);

    if (event.createdById !== adminId) {
      throw new ForbiddenException('You can only update your own events');
    }

    await this.eventsRepository.update(id, { flyerPath });
    return this.findOne(id);
  }

  async updateCertificateTemplate(
    id: number,
    certificateTemplatePath: string,
    adminId: number,
  ): Promise<Event> {
    const event = await this.findOne(id);

    if (event.createdById !== adminId) {
      throw new ForbiddenException('You can only update your own events');
    }

    await this.eventsRepository.update(id, { certificateTemplatePath });
    return this.findOne(id);
  }

  async getEventParticipants(eventId: number, adminId: number) {
    const event = await this.findOne(eventId);

    if (event.createdById !== adminId) {
      throw new ForbiddenException('You can only view participants of your own events');
    }

    const participants = await this.participantsRepository.find({
      where: { eventId },
      relations: ['user', 'attendance'],
      order: { registeredAt: 'DESC' },
    });

    return participants.map(participant => ({
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
      where: {
        eventDate: MoreThanOrEqual(now.toISOString().split('T')[0]),
      },
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