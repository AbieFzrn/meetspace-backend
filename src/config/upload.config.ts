import { registerAs } from '@nestjs/config';
import { getEnv } from './utils/getEnv';

export default registerAs('upload', () => ({
  path: getEnv('UPLOAD_PATH', './uploads'),
  maxFileSize: parseInt(getEnv('MAX_FILE_SIZE', '5242880'), 10), // 5MB default
  allowedImageTypes: getEnv('ALLOWED_IMAGE_TYPES', 'jpg,jpeg,png,gif').split(','),
  allowedDocTypes: getEnv('ALLOWED_DOC_TYPES', 'pdf,doc,docx').split(','),
}));
