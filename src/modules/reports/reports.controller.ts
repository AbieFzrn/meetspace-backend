import { Controller, Get, Param, Query, Res, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/admin/export')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Roles(UserRole.ADMIN)
  @Get('events/:eventId/participants')
  async exportParticipants(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Query('format') format = 'csv',
    @Res() res: Response,
  ) {
    if (format === 'xlsx') {
      const buf = await this.reports.exportEventParticipantsXlsx(eventId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="event-${eventId}-participants.xlsx"`);
      return res.send(buf);
    } else {
      const buf = await this.reports.exportEventParticipantsCsv(eventId);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="event-${eventId}-participants.csv"`);
      return res.send(buf);
    }
  }

  @Roles(UserRole.ADMIN)
  @Get('events/summary')
  async exportEventsSummary(@Query('format') format = 'csv', @Res() res: Response) {
    if (format === 'xlsx') {
      const csvBuf = await this.reports.exportEventsSummaryCsv();
      const wb = require('xlsx').utils.book_new();
      const ws = require('xlsx').utils.csv_to_sheet(csvBuf.toString('utf8'));
      require('xlsx').utils.book_append_sheet(wb, ws, 'events');
      const buf = require('xlsx').write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="events-summary.xlsx"`);
      return res.send(buf);
    } else {
      const buf = await this.reports.exportEventsSummaryCsv();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="events-summary.csv"`);
      return res.send(buf);
    }
  }
}
