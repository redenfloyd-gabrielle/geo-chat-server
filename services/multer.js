const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure Multer storage to generate custom filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Set the destination folder for uploaded files
  },
  filename: (req, file, cb) => {
    // Generate a UUID for the file name
    const fileUuid = uuidv4();

    // Get the file extension from the MIME type
    const fileExtension = path.extname(file.originalname);

    // Combine UUID with file extension (e.g., `123e4567-e89b-12d3-a456-426614174000.png`)
    cb(null, `${fileUuid}${fileExtension}`);
  }
});

const upload = multer({ storage });

module.exports = upload;