const sqlite3 = require('sqlite3').verbose();

// Create SQLite database (memory or persistent file)
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    )`);
  }
});

// Function to get all users
const getAllUsers = (callback) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    callback(err, rows);
  });
};

// Function to add a new user
const addUser = (name, callback) => {
  db.run('INSERT INTO users (name) VALUES (?)', [name], function (err) {
    callback(err, this.lastID);
  });
};

module.exports = {
  getAllUsers,
  addUser,
};
