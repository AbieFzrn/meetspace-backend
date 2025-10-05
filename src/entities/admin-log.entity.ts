import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('admin_logs')
export class AdminLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'admin_id' })
  adminId: number;

  @Column({ length: 120 })
  action: string;

  @Column({ type: 'json', nullable: true })
  details: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
