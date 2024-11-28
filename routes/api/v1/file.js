const express = require('express');
const router = express.Router();
const upload = require('../../../services/multer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join('uploads');

router.get('/', (req, res) => {
  const uploadDir = path.join('uploads');

  // Read the files in the upload directory
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Error reading upload directory:', err);
      return res.status(500).json({ status: "fail", message: 'Failed to retrieve files.' });
    }
    const { protocol, hostname } = req;
    const port = req.socket.localPort;
    // Return the list of files
    res.status(200).json({
      status: "success",
      message: 'Files retrieved successfully.',
      files: files.map((filename) => ({
        filename,
        // file_path: `/uploads/${filename}`,
        file_path: `${protocol}://${hostname}:${port}/uploads/${filename}`
      })),
    });
  });
});

router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Handle Multer-specific errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ status: "fail", message: 'File size exceeds 25MB limit!' });
      }
      return res.status(400).json({ status: "fail", message: err.message });
    } else if (err) {
      // Handle other errors (e.g., invalid file type)
      return res.status(400).json({ status: "fail", message: err.message });
    }

    // Success
    if (!req.file) {
      return res.status(400).json({ status: "fail", message: 'No file uploaded!' });
    }
    const { protocol, hostname } = req;
    const port = req.socket.localPort;
    res.status(200).json({
      status: "success",
      message: 'File uploaded successfully!',
      data: {
        filename: req.file.filename,
        file_path: `${protocol}://${hostname}:${port}/uploads/${req.file.filename}`
      }
    });
  });
});




module.exports = router;
