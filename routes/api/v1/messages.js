const express = require('express');
const router = express.Router();
const upload = require('../../../services/multer');
const db = require('../../../services/db');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');


router.post('/', async (req, res) => {

  const { message, channel_uuid, user_uuid } = req.body;

  // Validation
  if (!message || !channel_uuid || !user_uuid) {
    return res.status(400).json({ status: "fail", error: 'All fields are required' });
  }
  // Generate UUID for the user
  const uuid = uuidv4();

  // Create timestamp using Day.js
  const createdOn = dayjs().unix();


  payload = {
    uuid,
    message,
    channel_uuid,
    user_uuid,
    created_on: createdOn,
    modified_on: createdOn
  }

  db.addMessage(payload, (err, message) => {
    if (err) {
      console.error('Error adding user:', err);
      return res.status(500).json({ status: "fail", error: `Failed to create message :: ${err.message}` });
    }

    // User created successfully
    console.log('Message created with ID:', message.uuid);
    return res.status(201).json({ status: "success", data: message });
  });
});


router.get('/', (req, res) => {
  db.getAllMessages((err, rows) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }

    res.json({ status: "success", data: rows, count: rows.length });
  });
});

router.get('/:uuid', (req, res) => {
  const { uuid } = req.params;
  console.log('req.params', req.params)
  db.getUserByUUID(uuid, (err, message) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }
    console.log('message::', message)
    if (!message) {
      return res.status(404).json({ status: "fail", error: 'Message not found' });
    }

    res.json({ status: "success", data: message });
  });
});

router.get('/channel_uuid/:uuid', (req, res) => {
  const { uuid } = req.params;
  console.log('req.params', req.params)
  db.getMessageByChannel(uuid, (err, messages) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }
    console.log('channels::', messages)

    res.json({ status: "success", data: messages });
  });
});


router.put('/:uuid', (req, res) => {
  const { uuid } = req.params;
  const { message } = req.body; // Assuming these fields can be updated

  console.log('req.params', req.params);

  // Validate request body
  if (!message) {
    return res.status(400).json({ status: "fail", error: 'At least one field must be provided for update' });
  }
  const modifiedOn = dayjs().unix();
  // Prepare the update data
  const payload = {};
  if (message) payload.message = message;



  payload.modified_on = modifiedOn
  console.log('payload', payload);

  // Call the database update function
  db.updateMessage(uuid, payload, (err, message) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }

    // console.log('message::', message);
    if (!message) {
      return res.status(404).json({ status: "fail", error: 'User not found' });
    }

    // Respond with the updated message data
    res.json({ status: "success", data: message });
  });
});

router.delete('/:uuid', (req, res) => {
  const { uuid } = req.params;
  console.log('req.params', req.params)
  db.deleteMessage(uuid, (err, result) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }

    // If result is null, it means user not found
    if (!result) {
      return res.status(404).json({ status: "fail", error: 'User not found' });
    }

    // Return success response
    return res.json({
      status: "success",
      message: result.message,
      data: result.data // Include the deleted user's data
    });
  });
});





module.exports = router;
