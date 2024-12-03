const express = require('express');
const router = express.Router();
const db = require('../../../services/db');
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');
// Get all users
router.get('/', (req, res) => {
  db.getAllFriendships((err, rows) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }

    res.json({ status: "success", data: rows, count: rows.length });
  });
});

router.post('/', async (req, res) => {
  const { user1_uuid, user2_uuid, status } = req.body;

  // Validation
  if (!user1_uuid || !user2_uuid) {
    return res.status(400).json({ status: "fail", error: 'All fields are required' });
  }
  // Generate UUID for the user
  const uuid = uuidv4();

  // Create timestamp using Day.js
  const createdOn = dayjs().unix();


  payload = {
    uuid,
    user1_uuid,
    user2_uuid,
    status: status,
    created_on: createdOn,
    modified_on: createdOn
  }

  db.addFriendship(payload, (err, friendship) => {
    if (err) {
      console.error('Error adding addFriendship:', err);
      return res.status(500).json({ status: "fail", error: `Failed to create addFriendship :: ${err.message}` });
    }

    // User created successfully
    console.log('addFriendship created with ID:', friendship);
    return res.status(201).json({ status: "success", data: friendship });
  });
});

router.get('/:uuid', (req, res) => {
  const { uuid } = req.params;
  console.log('req.params', req.params)
  db.getFriendshipByUuid(uuid, (err, friendship) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }
    console.log('friendship::', friendship)
    if (!friendship) {
      return res.status(404).json({ status: "fail", error: 'Friendship not found' });
    }

    res.json({ status: "success", data: friendship });
  });
});

router.get('/user_uuid/:uuid', (req, res) => {
  const { uuid } = req.params;
  console.log('req.params', req.params)
  db.getFriendshipByUserUuid(uuid, (err, friendships) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }
    console.log('friendship::', friendships)

    res.json({ status: "success", data: friendships, count: friendships.length });
  });
});

router.put('/:uuid', (req, res) => {
  const { uuid } = req.params;
  const { user1_uuid, user2_uuid, status } = req.body; // Assuming these fields can be updated

  console.log('req.params', req.params);

  // Validate request body
  if (!user1_uuid && !user2_uuid && !status) {
    return res.status(400).json({ status: "fail", error: 'At least one field must be provided for update' });
  }
  const modifiedOn = dayjs().unix();
  // Prepare the update data
  const payload = {};
  if (user1_uuid) payload.user1_uuid = user1_uuid;
  if (user2_uuid) payload.user2_uuid = user2_uuid;
  if (status) payload.status = status;


  payload.modified_on = modifiedOn
  console.log('payload', payload);

  // Call the database update function
  db.updateFriendship(uuid, payload, (err, friendship) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }

    console.log('friendship::', friendship);
    if (!friendship) {
      return res.status(404).json({ status: "fail", error: 'Friendship not found' });
    }

    // Respond with the updated friendship data
    res.json({ status: "success", data: friendship });
  });
});

router.delete('/:uuid', (req, res) => {
  const { uuid } = req.params;

  db.deleteFriendship(uuid, (err, result) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }
    if (!result) {
      return res.status(404).json({ status: "fail", error: 'Friendship not found' });
    }
    return res.json({
      status: "success",
      message: result.message,
      data: result.friendship // Include the deleted friendship's data
    });
  });
});





module.exports = router;
