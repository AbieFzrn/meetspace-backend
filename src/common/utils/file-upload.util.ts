import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const imageFileFilter = (req: Request, file: Express.Multer.File, callback: Function) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  const extension = extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(extension)) {
    return callback(new BadRequestException('Only image files (jpg, jpeg, png, gif) are allowed for flyers'), false);
  }
  callback(null, true);
};

export const documentFileFilter = (req: Request, file: Express.Multer.File, callback: Function) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const extension = extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(extension)) {
    return callback(new BadRequestException('Only document files (pdf, doc, docx) are allowed for certificates'), false);
  }
  callback(null, true);
};

export const editFileName = (req: Request, file: Express.Multer.File, callback: Function) => {
  const extension = extname(file.originalname);
  const randomName = uuidv4();
  callback(null, `${randomName}${extension}`);
};

export const flyerDestination = (req: Request, file: Express.Multer.File, callback: Function) => {
  callback(null, './uploads/flyers');
};

export const certificateDestination = (req: Request, file: Express.Multer.File, callback: Function) => {
  callback(null, './uploads/certificates');
};