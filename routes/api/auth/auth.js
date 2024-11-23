const express = require('express');
const router = express.Router();
const db = require('../../../services/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY; // Replace with an environment variable in production

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

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Validation
  if (!username || !password) {
    return res.status(400).json({ status: "fail", error: 'Username and password are required' });
  }

  // Find the user by username
  db.getUserByUsername(username, async (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ status: "fail", error: 'Internal server error' });
    }
    console.log('@___ user :: ', user)

    if (!user) {
      return res.status(404).json({ status: "fail", error: 'User not found' });
    }

    // Compare passwords
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ status: "fail", error: 'Invalid username or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { uuid: user.uuid, username: user.username, email: user.email },
      SECRET_KEY,
      { expiresIn: '1hr' }
    );

    // Login successful
    return res.status(200).json({
      status: "success",
      data: {
        token,
        user: {
          uuid: user.uuid,
          fullname: user.fullname,
          username: user.username,
          email: user.email,
          created_on: user.created_on,
          modified_on: user.modified_on
        }
      }
    });
  });
});

// Middleware to validate JWT token
function validateToken(req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1]; // Get token from 'Authorization' header

  if (!token) {
    return res.status(403).json({ status: "fail", error: 'Token is required' });
  }

  // Verify the token
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ status: "fail", error: 'Token has expired' });
      }
      return res.status(401).json({ status: "fail", error: 'Invalid token' });
    }

    // Attach decoded user info to the request object
    req.user = decoded;
    next(); // Continue to the next middleware or route handler
  });
}

// Endpoint to check if the token is valid
router.get('/validate-token', validateToken, (req, res) => {
  return res.status(200).json({
    status: "success",
    message: "Token is valid",
    user: req.user // Send decoded user info back
  });
});

module.exports = router;
