import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../entities/user.entity';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles(UserRole.ADMIN)
  @Get('overview')
  async overview() {
    return this.adminService.getOverview();
  }

  @Roles(UserRole.ADMIN)
  @Get('users')
  async users(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.adminService.listUsers(page, limit);
  }

  @Roles(UserRole.ADMIN)
  @Patch('users/:id/role')
  async updateRole(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(admin.id, id, body.role);
  }

  @Roles(UserRole.ADMIN)
  @Patch('users/:id/status')
  async toggleStatus(
    @CurrentUser() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body('active', ParseBoolPipe) active: boolean,
  ) {
    return this.adminService.toggleUserStatus(admin.id, id, active);
  }

  @Roles(UserRole.ADMIN)
  @Post('events/:id/clone')
  async cloneEvent(@CurrentUser() admin: User, @Param('id', ParseIntPipe) id: number) {
    return this.adminService.cloneEvent(admin.id, id);
  }

  @Roles(UserRole.ADMIN)
  @Post('events/delete-bulk')
  async deleteBulk(@CurrentUser() admin: User, @Body() body: BulkDeleteDto) {
    return this.adminService.deleteEvents(admin.id, body.ids);
  }

  @Roles(UserRole.ADMIN)
  @Get('events/:id/participants')
  async participants(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.listEventParticipants(id);
  }

  @Roles(UserRole.ADMIN)
  @Get('export/participants')
  async exportParticipants(@Query('eventId') eventId?: string) {
    const file = await this.adminService.exportParticipantsToExcel(eventId ? Number(eventId) : undefined);
    return { message: 'Export completed', file };
  }

  @Roles(UserRole.ADMIN)
  @Post('bulk/generate-certificates/:eventId')
  async bulkGenerate(
    @CurrentUser() admin: User,
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.adminService.bulkGenerateCertificates(admin.id, eventId);
  }

  @Roles(UserRole.ADMIN)
  @Get('system/stats')
  async stats() {
    return this.adminService.getSystemStats();
  }

  @Roles(UserRole.ADMIN)
  @Get('logs')
  async logs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getLogs(page, limit);
  }
}
