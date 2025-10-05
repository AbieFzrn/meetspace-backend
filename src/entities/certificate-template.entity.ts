import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('certificate_templates')
@Index(['name'])
export class CertificateTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  // relative path from UPLOAD_PATH, e.g. "certificates/templates/my-template-v1.html"
  @Column({ name: 'file_path', length: 500 })
  filePath: string;

  @Column({ name: 'type', length: 20, default: 'html' })
  type: 'html' | 'image' | 'pdf';

  @Column({ name: 'version', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
