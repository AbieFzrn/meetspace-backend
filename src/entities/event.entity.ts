import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Participant } from './participant.entity';
import { Certificate } from './certificate.entity';

@Entity('events')
@Index(['eventDate'])
@Index(['registrationDeadline'])
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'event_date', type: 'date' })
  eventDate: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime: string;

  @Column({ length: 255 })
  location: string;

  @Column({ name: 'flyer_path', length: 500, nullable: true })
  flyerPath: string;

  @Column({ name: 'certificate_template_path', length: 500, nullable: true })
  certificateTemplatePath: string;

  @Column({ name: 'max_participants', default: 0 })
  maxParticipants: number;

  @Column({ name: 'registration_deadline', type: 'datetime', nullable: true })
  registrationDeadline: Date;

  @Column({ name: 'created_by' })
  createdById: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.createdEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @OneToMany(() => Participant, (participant) => participant.event)
  participants: Participant[];

  @OneToMany(() => Certificate, (certificate) => certificate.event)
  certificates: Certificate[];
}