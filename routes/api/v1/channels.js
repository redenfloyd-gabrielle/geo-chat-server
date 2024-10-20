const express = require('express');
const router = express.Router();
const db = require('../../../services/db');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
// Get all users
router.get('/', (req, res) => {
  db.getAllChannels((err, rows) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }
    // Map over the rows to parse user_uuids
    const formattedRows = rows.map(row => {
      return {
        ...row,
        user_uuids: JSON.parse(row.user_uuids) // Convert string to JSON array
      };
    });
    res.json({ status: "success", data: formattedRows, count: rows.length });
  });
});

router.post('/', async (req, res) => {

  const { name, user_uuids, type } = req.body;

  // Validation
  if (!name || !Array.isArray(user_uuids) || user_uuids.length === 0 || !type) {
    return res.status(400).json({ status: "fail", error: 'All fields are required' });
  }
  // Generate UUID for the user
  const uuid = uuidv4();

  // Create timestamp using Day.js
  const createdOn = dayjs().unix();


  payload = {
    uuid,
    name,
    user_uuids: JSON.stringify(user_uuids),
    type,
    created_on: createdOn,
    modified_on: createdOn
  }

  db.addChannel(payload, (err, channel) => {
    if (err) {
      console.error('Error adding user:', err);
      return res.status(500).json({ status: "fail", error: `Failed to create channel :: ${err.message}` });
    }

    // User created successfully
    console.log('Channel created with ID:', channel);
    channel.user_uuids = JSON.parse(channel.user_uuids)
    return res.status(201).json({ status: "success", channel });
  });
});

router.get('/:uuid', (req, res) => {
  const { uuid } = req.params;
  console.log('req.params', req.params)
  db.getChannelByUUID(uuid, (err, user) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }
    console.log('user::', user)
    if (!user) {
      return res.status(404).json({ status: "fail", error: 'User not found' });
    }

    res.json({ status: "success", data: user });
  });
});

router.get('/user_uuid/:uuid', (req, res) => {
  const { uuid } = req.params;
  console.log('req.params', req.params)
  db.getChannelsByUserUuid(uuid, (err, channels) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }
    console.log('channels::', channels)
    // Map over the rows to parse user_uuids
    const formattedRows = channels.map(channel => {
      return {
        ...channel,
        user_uuids: JSON.parse(channel.user_uuids) // Convert string to JSON array
      };
    });
    res.json({ status: "success", data: formattedRows });
  });
});

router.put('/:uuid', (req, res) => {
  const { uuid } = req.params;
  const { name, user_uuids, type } = req.body; // Assuming these fields can be updated

  console.log('req.params', req.params);

  // Validate request body
  if (!name && !user_uuids && !type) {
    return res.status(400).json({ status: "fail", error: 'At least one field must be provided for update' });
  }
  const modifiedOn = dayjs().unix();
  // Prepare the update data
  const payload = {};
  if (name) payload.name = name;
  if (type) payload.type = type;
  if (user_uuids) {
    if (Array.isArray(user_uuids)) {
      payload.user_uuids = JSON.stringify(user_uuids); // Store as JSON string
    } else {
      return res.status(400).json({ status: "fail", error: 'user_uuids must be an array' });
    }
  }

  payload.modified_on = modifiedOn
  console.log('payload', payload);

  // Call the database update function
  db.updateChannel(uuid, payload, (err, channel) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }

    console.log('user::', channel);
    if (!channel) {
      return res.status(404).json({ status: "fail", error: 'Channel not found' });
    }

    // Respond with the updated user data
    res.json({ status: "success", data: channel });
  });
});

router.delete('/:uuid', (req, res) => {
  const { uuid } = req.params;
  console.log('req.params', req.params)
  db.deleteUser(uuid, (err, result) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }

    // If result is null, it means user not found
    if (!result) {
      return res.status(404).json({ status: "fail", error: 'User not found' });
    }

    // Return success response
    return res.json({ status: "success", message: result.message });
  });
});





module.exports = router;
