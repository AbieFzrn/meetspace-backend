import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  Param,
  ParseIntPipe,
  Delete,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TemplatesService } from './templates.service';
import { diskStorage } from 'multer';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../entities/user.entity';
import * as fs from 'fs';

@Controller('admin/certificates/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesController {
  constructor(private readonly service: TemplatesService, private config: ConfigService) {}

  private getUploadBase() {
    return this.config.get<string>('UPLOAD_PATH') || this.config.get<string>('upload.path') || './uploads';
  }

  @Roles(UserRole.ADMIN)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dest = join(process.cwd(), (process.env.UPLOAD_PATH || './uploads'), 'certificates', 'templates');
          if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          const unique = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
          cb(null, unique);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadTemplate(@UploadedFile() file: Express.Multer.File, @Body('name') name?: string) {
    if (!file) throw new BadRequestException('No file uploaded');
    const relative = join('certificates', 'templates', file.filename);
    const tplName = name || file.originalname;
    return this.service.createTemplate(tplName, relative, 'html');
  }

  @Roles(UserRole.ADMIN)
  @Get()
  async list() {
    return this.service.listTemplates();
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.service.getTemplateById(id);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async del(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteTemplate(id);
  }
}
