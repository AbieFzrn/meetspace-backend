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
import { Participant } from './participant.entity';
import { Event } from './event.entity';

@Entity('attendances')
@Index(['eventId', 'attendedAt'])
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'participant_id' })
  participantId: number;

  @Column({ name: 'event_id' })
  eventId: number;

  @Column({ default: true })
  verified: boolean;

  @CreateDateColumn({ name: 'attended_at' })
  attendedAt: Date;

  // Relations
  @OneToOne(() => Participant, (participant) => participant.attendance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant: Participant;

  @ManyToOne(() => Event, (event) => event.certificates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;
}