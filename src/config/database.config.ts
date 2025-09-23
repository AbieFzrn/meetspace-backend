import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { getEnv } from './utils/getEnv';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'mysql',
    host: getEnv('DB_HOST', 'localhost'),
    port: parseInt(getEnv('DB_PORT', '3306'), 10),
    username: getEnv('DB_USERNAME', 'root'),
    password: getEnv('DB_PASSWORD', ''),
    database: getEnv('DB_DATABASE', 'event_management'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: getEnv('NODE_ENV', 'development') === 'development', // Only for dev
    logging: getEnv('NODE_ENV', 'development') === 'development',
    timezone: 'Z',
    charset: 'utf8mb4',
  }),
);
