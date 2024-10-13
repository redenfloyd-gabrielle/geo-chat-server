const express = require('express');
const router = express.Router();
const db = require('../services/db');

// Get all users
router.get('/users', (req, res) => {
  db.getAllUsers((err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ users: rows });
  });
});

// Add a new user
router.post('/users', (req, res) => {
  const { name } = req.body;
  db.addUser(name, (err, id) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id, name });
  });
});

module.exports = router;
