import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { unlinkSync, existsSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// ===============================
// 🧩 Multer Config (for /uploads)
// ===============================
export const multerConfig = diskStorage({
  destination: (req, file, cb) => {
    // Default folder jika tidak ditentukan
    const folder = 'uploads/event-img';
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// ===============================
// 🧹 File Cleanup Interceptor
// ===============================
@Injectable()
export class FileCleanupInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap({
        error: () => {
          const request = context.switchToHttp().getRequest();

          // 🧾 Clean up multiple uploaded files
          if (request.files) {
            Object.values(request.files).forEach(
              (files: Express.Multer.File[]) => {
                files.forEach((file) => {
                  if (file?.path && existsSync(file.path)) {
                    unlinkSync(file.path);
                  }
                });
              },
            );
          }

          // 🧾 Clean up single uploaded file
          if (request.file?.path && existsSync(request.file.path)) {
            unlinkSync(request.file.path);
          }
        },
      }),
    );
  }
}
