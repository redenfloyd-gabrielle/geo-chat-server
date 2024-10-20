const express = require('express');
const router = express.Router();
const db = require('../../../services/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

// Add a new user
router.post('/register', async (req, res) => {

  const { fullname, username, email, password } = req.body;

  // Validation
  if (!fullname || !username || !email || !password) {
    return res.status(400).json({ status: "fail", error: 'All fields are required' });
  }
  // Check if the email already exists
  db.getUserByEmail(email, async (err, existingUser) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ status: "fail", error: 'Internal server error' });
    }

    // console.log('existingUser', existingUser);
    if (existingUser) {
      return res.status(409).json({ status: "fail", error: `Email ${email} already exists` });
    }

    db.getUserByUsername(username, async (err, existingUser) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ status: "fail", error: 'Internal server error' });
      }

      // console.log('existingUser', existingUser);
      if (existingUser) {
        return res.status(409).json({ status: "fail", error: `Username ${username} already exists` });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate UUID for the user
      const uuid = uuidv4();

      // Create timestamp using Day.js
      const createdOn = dayjs().unix();

      db.addUser({
        uuid,
        fullname,
        username,
        email,
        password: hashedPassword,
        created_on: createdOn,
        modified_on: createdOn
      }, (err, user) => {
        if (err) {
          console.error('Error adding user:', err);
          return res.status(500).json({ status: "fail", error: 'Failed to create user' });
        }

        // User created successfully
        console.log('User created with ID:', user.uuid);
        return res.status(201).json({ status: "success", data: user });
      });

    });
  });
});

module.exports = router;
