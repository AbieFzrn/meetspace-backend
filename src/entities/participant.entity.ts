import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Event } from './event.entity';
import { Attendance } from './attendance.entity';

@Entity('participants')
@Index(['userId', 'eventId'], { unique: true })
@Index(['registrationToken'])
export class Participant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'event_id' })
  eventId: number;

  @Column({ name: 'registration_token', length: 10 })
  registrationToken: string;

  @Column({ name: 'token_sent_at', type: 'timestamp' })
  tokenSentAt: Date;

  @CreateDateColumn({ name: 'registered_at' })
  registeredAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Event, (event) => event.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @OneToOne(() => Attendance, (attendance) => attendance.participant)
  attendance: Attendance;
}