import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'hotels',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 600, crop: 'fill' }],
  },
});

const imageOnlyFilter = (_req, file, cb) => {
  if (file?.mimetype?.startsWith('image/')) {
    return cb(null, true);
  }

  return cb(new Error('Only image files are allowed.'));
};

export const uploadHotelImage = multer({
  storage,
  fileFilter: imageOnlyFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
