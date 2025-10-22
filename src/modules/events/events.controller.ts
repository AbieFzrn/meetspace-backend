import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';

import { EventsService } from './events.service';
import { ParticipantsService } from '../participants/participants.service';
import { UploadsService } from '../uploads/uploads.service';

import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SearchEventsDto } from './dto/search-events.dto';
import { CheckinDto } from '../participants/dto/checkin.dto';

import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';

import {
  FileCleanupInterceptor,
  multerConfig,
} from '../../common/interceptors/file-upload.interceptor';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly participantsService: ParticipantsService,
    private readonly uploadsService: UploadsService,
  ) {}

  // ===========================
  // 📸 Upload Event Image (Admin)
  // ===========================
  @Post(':id/image')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('image', { storage: multerConfig }))
  async uploadEventImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') adminId: number,
  ) {
    // ✅ Validasi dan simpan file
    this.uploadsService.validateImageFile(file);
    const filename = this.uploadsService.saveFile(file, 'event-img');

    // ✅ Update event dengan image baru
    await this.eventsService.updateImagePath(id, filename, adminId);

    return this.eventsService.findOne(id);
  }

  // ===========================
  // 🧩 Admin Routes
  // ===========================

  @Post()
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'flyer', maxCount: 1 },
        { name: 'certificateTemplate', maxCount: 1 },
      ],
      { storage: multerConfig },
    ),
    FileCleanupInterceptor,
  )
  async create(
    @Body() createEventDto: CreateEventDto,
    @CurrentUser('id') adminId: number,
    @UploadedFiles()
    files?: {
      flyer?: Express.Multer.File[];
      certificateTemplate?: Express.Multer.File[];
    },
  ) {
    const event = await this.eventsService.create(createEventDto, adminId);

    if (files?.flyer?.[0]) {
      this.uploadsService.validateImageFile(files.flyer[0]);
      const flyerFilename = this.uploadsService.saveFile(files.flyer[0], 'flyers');
      await this.eventsService.updateFlyer(event.id, flyerFilename, );
    }

    if (files?.certificateTemplate?.[0]) {
      this.uploadsService.validateDocumentFile(files.certificateTemplate[0]);
      const certFilename = this.uploadsService.saveFile(
        files.certificateTemplate[0],
        'certificates',
      );
      await this.eventsService.updateCertificateTemplate(event.id, certFilename);
    }

    return this.eventsService.findOne(event.id);
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  async findAllForAdmin(@Query() searchDto: SearchEventsDto) {
    return this.eventsService.findAll(searchDto);
  }

  @Get('admin/:id')
  @Roles(UserRole.ADMIN)
  async findOneForAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findOne(id);
  }

  @Patch('admin/:id')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'flyer', maxCount: 1 },
        { name: 'certificateTemplate', maxCount: 1 },
      ],
      { storage: multerConfig },
    ),
    FileCleanupInterceptor,
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser('id') adminId: number,
    @UploadedFiles()
    files?: {
      flyer?: Express.Multer.File[];
      certificateTemplate?: Express.Multer.File[];
    },
  ) {
    const event = await this.eventsService.update(id, updateEventDto);

    if (files?.flyer?.[0]) {
      this.uploadsService.validateImageFile(files.flyer[0]);
      if (event.flyerPath) {
        this.uploadsService.deleteFile(event.flyerPath, 'flyers');
      }
      const flyerFilename = this.uploadsService.saveFile(files.flyer[0], 'flyers');
      await this.eventsService.updateFlyer(id, flyerFilename);
    }

    if (files?.certificateTemplate?.[0]) {
      this.uploadsService.validateDocumentFile(files.certificateTemplate[0]);
      if (event.certificateTemplatePath) {
        this.uploadsService.deleteFile(event.certificateTemplatePath, 'certificates');
      }
      const certFilename = this.uploadsService.saveFile(
        files.certificateTemplate[0],
        'certificates',
      );
      await this.eventsService.updateCertificateTemplate(id, certFilename);
    }

    return this.eventsService.findOne(id);
  }

  @Delete('admin/:id')
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') adminId: number,
  ) {
    await this.eventsService.remove(id);
    return { message: 'Event deleted successfully' };
  }

  @Get('admin/:id/participants')
  @Roles(UserRole.ADMIN)
  async getEventParticipants(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.eventsService.getEventParticipants(id);
  }

  // ===========================
  // 🌍 Public Routes
  // ===========================
  @Public()
  @Get()
  async findAll(@Query() searchDto: SearchEventsDto) {
    return this.eventsService.findPublicEvents(searchDto);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findOnePublic(id);
  }

  // ===========================
  // 👤 User Routes (Authenticated)
  // ===========================
  @Post(':id/register')
  @UseGuards(ThrottlerGuard)
  async registerForEvent(
    @Param('id', ParseIntPipe) eventId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.participantsService.registerForEvent(eventId, userId);
  }

  @Post(':id/checkin')
  @UseGuards(ThrottlerGuard)
  async checkin(
    @Param('id', ParseIntPipe) eventId: number,
    @Body() checkinDto: CheckinDto,
    @CurrentUser('id') userId: number,
  ) {
    checkinDto.eventId = eventId;
    return this.participantsService.checkin(checkinDto, userId);
  }

  @Get('user/history')
  async getUserEventHistory(@CurrentUser('id') userId: number) {
    return this.participantsService.getUserEventHistory(userId);
  }

  @Get(':id/registration-status')
  async checkRegistrationStatus(
    @Param('id', ParseIntPipe) eventId: number,
    @CurrentUser('id') userId: number,
  ) {
    const isRegistered = await this.eventsService.checkRegistrationStatus(eventId, userId);
    return { isRegistered };
  }
}
