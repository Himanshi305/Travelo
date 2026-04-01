import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

if (!cloudName) {
  throw new Error('Missing CLOUDINARY_CLOUD_NAME');
}

if (!apiKey) {
  throw new Error('Missing CLOUDINARY_API_KEY');
}

if (!apiSecret) {
  throw new Error('Missing CLOUDINARY_API_SECRET');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export default cloudinary;
