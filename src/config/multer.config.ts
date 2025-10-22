import { diskStorage } from 'multer';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

// Folder dasar upload
const BASE_UPLOAD_PATH = join(__dirname, '../../uploads');

export const multerConfig = {
    storage: diskStorage({
        destination: (req, file, cb) => {
            // 🧩 Tentukan folder berdasarkan fieldname
            let subFolder = 'bin';
            if (file.fieldname === 'image') subFolder = 'event-img';
            else if (file.fieldname === 'flyer') subFolder = 'flyers';
            else if (file.fieldname === 'certificateTemplate') subFolder = 'certificates';

            const uploadPath = join(BASE_UPLOAD_PATH, subFolder);
            if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        },

        filename: (req, file, cb) => {
            const uniqueName = `${uuid()}-${file.originalname}`;
            cb(null, uniqueName);
        },
    }),

    limits: {
        fileSize: 10 * 1024 * 1024, // max 10MB
    },

    fileFilter: (req, file, cb) => {
        // ✅ Validasi file berdasarkan fieldname
        if (file.fieldname === 'flyer' || file.fieldname === 'image') {
            // Hanya image
            if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
                return cb(new BadRequestException('Only image files are allowed!'), false);
            }
        } else if (file.fieldname === 'certificateTemplate') {
            // Hanya dokumen
            if (
                !file.mimetype.match(
                    /^(application\/pdf|application\/msword|application\/vnd.openxmlformats-officedocument.wordprocessingml.document)$/,
                )
            ) {
                return cb(new BadRequestException('Only PDF, DOC, and DOCX files are allowed!'), false);
            }
        }

        cb(null, true);
    },
};
