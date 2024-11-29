
const express = require('express');
const router = express.Router();
const db = require('../../../services/db');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

router.post('/', async (req, res) => {

  const { channel_uuid, user_uuid, latitude, longitude, weather } = req.body;

  // Validation
  if (!channel_uuid || !user_uuid) {
    return res.status(400).json({ status: "fail", error: 'All fields are required' });
  }
  // Generate UUID for the user
  const uuid = uuidv4();

  // Create timestamp using Day.js
  const createdOn = dayjs().unix();


  payload = {
    uuid,
    channel_uuid,
    user_uuid,
    latitude,
    longitude,
    weather,
    created_on: createdOn,
    modified_on: createdOn
  }

  db.addLocation(payload, (err, message) => {
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
  db.getAllLocations((err, rows) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }

    res.json({ status: "success", data: rows, count: rows.length });
  });
});

router.get('/:uuid', (req, res) => {
  const { uuid } = req.params;
  console.log('req.params', req.params)
  db.getLocationByUuid(uuid, (err, message) => {
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

router.get('/user_uuid/:uuid', (req, res) => {
  const { uuid } = req.params;
  console.log('req.params', req.params)
  db.getLocationByUser(uuid, (err, messages) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }
    console.log('channels::', messages)

    res.json({ status: "success", data: messages });
  });
});

router.get('/channel_uuid/:uuid', (req, res) => {
  const { uuid } = req.params;
  console.log('req.params', req.params)
  db.getLocationByChannel(uuid, (err, messages) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }
    console.log('channels::', messages)

    res.json({ status: "success", data: messages });
  });
});


router.put('/:uuid', (req, res) => {
  const { uuid } = req.params;
  const { user_uuid, latitude, longitude, weather } = req.body; // Assuming these fields can be updated

  console.log('req.params', req.params);

  // Validate request body
  if (!user_uuid && !latitude && !longitude && weather) {
    return res.status(400).json({ status: "fail", error: 'At least one field must be provided for update' });
  }
  const modifiedOn = dayjs().unix();
  // Prepare the update data
  const payload = {};
  if (user_uuid) payload.user_uuid = user_uuid;
  if (latitude) payload.latitude = latitude;
  if (longitude) payload.longitude = longitude;
  if (weather) payload.weather = weather;


  payload.modified_on = modifiedOn
  console.log('payload', payload);

  // Call the database update function
  db.updateLocation(uuid, payload, (err, user) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }

    console.log('user::', user);
    if (!user) {
      return res.status(404).json({ status: "fail", error: 'User not found' });
    }

    // Respond with the updated user data
    res.json({ status: "success", data: user });
  });
});

router.delete('/:uuid', (req, res) => {
  const { uuid } = req.params;
  console.log('req.params', req.params)
  db.deleteLocation(uuid, (err, result) => {
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
      data: result.location // Include the deleted user's data
    });
  });
});





module.exports = router;
