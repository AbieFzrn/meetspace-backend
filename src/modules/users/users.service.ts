import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async updateEmailVerification(userId: number, isVerified: boolean): Promise<void> {
    await this.usersRepository.update(userId, { isEmailVerified: isVerified });
  }

  async updatePassword(userId: number, newPasswordHash: string): Promise<void> {
    await this.usersRepository.update(userId, { passwordHash: newPasswordHash });
  }

  async updateLastActivity(userId: number): Promise<void> {
    await this.usersRepository.update(userId, { lastActivity: new Date() });
  }

  async updateSessionToken(userId: number, sessionToken: string): Promise<void> {
    await this.usersRepository.update(userId, { 
      sessionToken,
      lastActivity: new Date()
    });
  }

  async clearSession(userId: number): Promise<void> {
    await this.usersRepository.update(userId, { 
      sessionToken: null,
      lastActivity: null
    });
  }
}