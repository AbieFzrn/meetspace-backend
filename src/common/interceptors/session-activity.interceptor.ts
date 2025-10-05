import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class SessionActivityInterceptor implements NestInterceptor {
  constructor(private usersService: UsersService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return next.handle().pipe(
      tap(async () => {
        if (user && user.id) {
          await this.usersService.updateLastActivity(user.id);
        }
      }),
    );
  }
}