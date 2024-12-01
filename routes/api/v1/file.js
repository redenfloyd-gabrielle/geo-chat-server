const express = require('express');
const router = express.Router();
const upload = require('../../../services/multer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../../../services/db');

const UPLOADS_DIR = path.join('uploads');

router.get('/', (req, res) => {
  // Call the getAllFiles function to retrieve file metadata from the database
  db.getAllFiles((err, files) => {
    if (err) {
      return res.status(500).json({ status: "fail", message: 'Failed to retrieve files.' });
    }

    const { protocol, hostname } = req;
    const port = req.socket.localPort;
    let baseUrl = `${protocol}://${hostname}:${port}`

    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // Check if hostname is not an IP address or localhost
    if (!ipRegex.test(hostname) && hostname !== 'localhost') {
      baseUrl = `${protocol}://${hostname}`
    }


    // Return the list of file metadata (without actual file data)
    res.status(200).json({
      status: "success",
      data: files.map((file) => ({
        file_uuid: file.uuid,
        file_path: `${baseUrl}/api/v1/files/${file.uuid}`, // URL to access the file
        filename: file.filename,
        mimetype: file.mimetype,
      })),
    });
  });
});

router.get('/:uuid', (req, res) => {
  const fileUuid = req.params.uuid;

  // Call the getFileByUuid function to retrieve the file from the database
  db.getFileByUuid(fileUuid, (err, fileDetails) => {
    if (err) {
      return res.status(500).json({ status: "fail", message: err.message });
    }

    // Set the correct MIME type based on file's type
    res.setHeader('Content-Type', fileDetails.mimetype);

    // Optional: Set Content-Disposition header to inline, so it shows in the browser
    res.setHeader('Content-Disposition', 'inline; filename="' + fileDetails.filename + '"');

    // Send the file data directly as raw binary data (Buffer)
    res.send(fileDetails.filedata);  // Send the raw file data as the response
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

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({ status: "fail", message: 'No file uploaded!' });
    }

    // Call the uploadFile function to insert the file into the database
    db.uploadFile(req.file, (err, fileDetails) => {
      if (err) {
        console.log('@__ err :: ', err)
        return res.status(500).json({ status: "fail", message: 'Error uploading file' });
      }

      const { protocol, hostname } = req;
      const port = req.socket.localPort;
      let baseUrl = `${protocol}://${hostname}:${port}`

      const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

      // Check if hostname is not an IP address or localhost
      if (!ipRegex.test(hostname) && hostname !== 'localhost') {
        baseUrl = `${protocol}://${hostname}`
      }
      // Return the file details and the base64 file data in the response
      res.status(200).json({
        status: "success",
        message: 'File uploaded successfully!',
        data: {
          file_uuid: fileDetails.uuid,
          file_path: `${baseUrl}/api/v1/files/${fileDetails.uuid}`, // URL to access the file
          filename: fileDetails.filename,
          // filedata: `data:${fileDetails.mimetype};base64,${fileDetails.filedata}`,
          mimetype: fileDetails.mimetype
        }
      });
    });
  });
});

// router.post('/upload', (req, res) => {
//   upload.single('file')(req, res, (err) => {
//     if (err instanceof multer.MulterError) {
//       // Handle Multer-specific errors
//       if (err.code === 'LIMIT_FILE_SIZE') {
//         return res.status(400).json({ status: "fail", message: 'File size exceeds 25MB limit!' });
//       }
//       return res.status(400).json({ status: "fail", message: err.message });
//     } else if (err) {
//       // Handle other errors (e.g., invalid file type)
//       return res.status(400).json({ status: "fail", message: err.message });
//     }

//     // Success
//     if (!req.file) {
//       return res.status(400).json({ status: "fail", message: 'No file uploaded!' });
//     }
//     const { protocol, hostname } = req;
//     const port = req.socket.localPort;
//     res.status(200).json({
//       status: "success",
//       message: 'File uploaded successfully!',
//       data: {
//         filename: req.file.filename,
//         file_path: `${protocol}://${hostname}:${port}/uploads/${req.file.filename}`
//       }
//     });
//   });
// });




module.exports = router;
