import { Controller, Get, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Roles(UserRole.ADMIN)
  @Get('events-per-month')
  async eventsPerMonth(@Query('year', ParseIntPipe) year = new Date().getFullYear()) {
    return this.service.getEventsPerMonth(year);
  }

  @Roles(UserRole.ADMIN)
  @Get('participants-per-month')
  async participantsPerMonth(@Query('year', ParseIntPipe) year = new Date().getFullYear()) {
    return this.service.getParticipantsPerMonth(year);
  }

  @Roles(UserRole.ADMIN)
  @Get('top-events')
  async topEvents(@Query('limit', ParseIntPipe) limit = 10) {
    return this.service.getTopEvents(limit);
  }
}
