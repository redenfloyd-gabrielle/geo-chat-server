const express = require('express');
const router = express.Router();
const db = require('../../../services/db');
const dayjs = require('dayjs');
// Get all users
router.get('/', (req, res) => {
  db.getAllUsers((err, rows) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }

    res.json({ status: "success", data: rows, count: rows.length });
  });
});

router.get('/:uuid', (req, res) => {
  const { uuid } = req.params;
  console.log('req.params', req.params)
  db.getUserByUUID(uuid, (err, user) => {
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

router.put('/:uuid', (req, res) => {
  const { uuid } = req.params;
  const { fullname, username, email } = req.body; // Assuming these fields can be updated

  console.log('req.params', req.params);

  // Validate request body
  if (!fullname && !username && !email) {
    return res.status(400).json({ status: "fail", error: 'At least one field must be provided for update' });
  }
  const modifiedOn = dayjs().unix();
  // Prepare the update data
  const payload = {};
  if (fullname) payload.fullname = fullname;
  if (username) payload.username = username;
  if (email) payload.email = email;


  payload.modified_on = modifiedOn
  console.log('payload', payload);

  // Call the database update function
  db.updateUser(uuid, payload, (err, user) => {
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

  db.deleteUser(uuid, (err, result) => {
    if (err) {
      return res.status(500).json({ status: "fail", error: err.message });
    }
    if (!result) {
      return res.status(404).json({ status: "fail", error: 'User not found' });
    }
    result.user.pop('password')
    return res.json({
      status: "success",
      message: result.message,
      data: result.user // Include the deleted user's data
    });
  });
});





module.exports = router;
