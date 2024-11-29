const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tmpDir = path.join('tmp');
    cb(null, tmpDir);// Set the destination folder for uploaded files
  },
  filename: (req, file, cb) => {
    // Generate a UUID for the file name
    const fileUuid = uuidv4();

    // Get the file extension from the original file name
    const fileExtension = path.extname(file.originalname);

    // Combine UUID with file extension
    cb(null, `${fileUuid}${fileExtension}`);
  }
});

// Multer configuration with file size and type restrictions
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type! Only JPEG, PNG, and PDF are allowed.'));
    }
  },
});

module.exports = upload;