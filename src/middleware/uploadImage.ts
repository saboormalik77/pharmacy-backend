import multer from 'multer';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter to only accept image files
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept common image MIME types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
  }
};

// Configure multer for image uploads
export const uploadImage = multer({
  storage,
  fileFilter: fileFilter as any,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
});
