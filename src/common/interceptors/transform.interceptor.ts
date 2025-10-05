import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { instanceToPlain } from 'class-transformer';

export interface Response<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => {
        const plainData = instanceToPlain(data);

        let message: string | undefined;
        let responseData: T | undefined;

        // Kalau handler return string → anggap sebagai message
        if (typeof plainData === 'string') {
          message = plainData;
        } else if (plainData && typeof plainData === 'object' && 'message' in plainData) {
          // Kalau ada field "message" di object → ambil itu
          message = (plainData as any).message;
          // dan sisanya jadi data
          const { message: _, ...rest } = plainData as any;
          responseData = rest as T;
        } else {
          responseData = plainData as T;
        }

        return {
          success: statusCode < 400,
          statusCode,
          message,
          data: responseData,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
