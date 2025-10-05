import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  sessionToken: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    // Check session token
    if (user.sessionToken !== payload.sessionToken) {
      throw new UnauthorizedException('Invalid session');
    }

    // Check session timeout (5 minutes)
    if (user.lastActivity) {
      const now = new Date();
      const diffMinutes = (now.getTime() - new Date(user.lastActivity).getTime()) / (1000 * 60);
      
      if (diffMinutes > 5) {
        // Clear session
        await this.usersService.clearSession(user.id);
        throw new UnauthorizedException('Session expired');
      }
    }

    return user;
  }
}