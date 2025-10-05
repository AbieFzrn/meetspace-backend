import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { unlinkSync, existsSync } from 'fs';

@Injectable()
export class FileCleanupInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap({
        error: () => {
          const request = context.switchToHttp().getRequest();
          // Clean up uploaded files if request fails
          if (request.files) {
            Object.values(request.files).forEach((files: Express.Multer.File[]) => {
              files.forEach(file => {
                if (existsSync(file.path)) {
                  unlinkSync(file.path);
                }
              });
            });
          }
          if (request.file && existsSync(request.file.path)) {
            unlinkSync(request.file.path);
          }
        }
      })
    );
  }
}