import { registerAs } from '@nestjs/config';
import { MailerOptions } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { getEnv } from './utils/getEnv';

export default registerAs(
  'mail',
  (): MailerOptions => ({
    transport: {
      host: getEnv('MAIL_HOST'),
      port: parseInt(getEnv('MAIL_PORT', '587'), 10),
      secure: false, // true for 465, false for other ports
      auth: {
        user: getEnv('MAIL_USERNAME'),
        pass: getEnv('MAIL_PASSWORD'),
      },
    },
    defaults: {
      from: getEnv('MAIL_FROM', '"No Reply" <noreply@example.com>'),
    },
    template: {
      dir: join(__dirname, '../templates/email'),
      adapter: new HandlebarsAdapter(),
      options: {
        strict: true,
      },
    },
  }),
);
