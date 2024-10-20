const sqlite3 = require('sqlite3').verbose();

// Create SQLite database (memory or persistent file)
const db = new sqlite3.Database('./chat-geo-database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    createTables()
  }
});

const createTables = function () {
  // Create tables
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS user (
        uuid TEXT PRIMARY KEY,
        fullname TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_on INTEGER NOT NULL,
        modified_on INTEGER NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS channel (
        uuid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        user_uuids TEXT NOT NULL,
        type TEXT CHECK(type IN ('Group', 'Direct Message')),
        created_on TEXT NOT NULL,
        modified_on INTEGER NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS message (
        uuid TEXT PRIMARY KEY,
        channel_uuid TEXT NOT NULL,
        user_uuid TEXT NOT NULL,
        message TEXT NOT NULL,
        created_on INTEGER NOT NULL,
        modified_on INTEGER NOT NULL,
        FOREIGN KEY (channel_uuid) REFERENCES Channel(uuid),
        FOREIGN KEY (user_uuid) REFERENCES User(uuid)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS location (
        uuid TEXT PRIMARY KEY,
        channel_uuid TEXT NOT NULL,
        user_uuid TEXT NOT NULL,
        latitude TEXT NOT NULL,
        longitude TEXT NOT NULL,
        weather TEXT,
        modified_on INTEGER NOT NULL,
        FOREIGN KEY (channel_uuid) REFERENCES Channel(uuid),
        FOREIGN KEY (user_uuid) REFERENCES User(uuid)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS friend (
        user1_uuid TEXT NOT NULL,
        user2_uuid TEXT NOT NULL,
        created_on TEXT NOT NULL,
        PRIMARY KEY (user1_uuid, user2_uuid),
        FOREIGN KEY (user1_uuid) REFERENCES User(uuid),
        FOREIGN KEY (user2_uuid) REFERENCES User(uuid)
    )`);
  });
}

const getAllUsers = function (callback) {
  db.all('SELECT * FROM user', [], (err, rows) => {
    callback(err, rows);
  });
};

const getUserByEmail = function (email, callback) {
  const query = 'SELECT * FROM user WHERE email = ?';

  db.get(query, [email], (err, row) => {
    if (err) {
      // Handle error appropriately
      return callback(err, null);
    }
    // Pass the row to the callback
    callback(null, row);
  });
};

const getUserByUsername = function (username, callback) {
  const query = 'SELECT * FROM user WHERE username = ?';

  db.get(query, [username], (err, row) => {
    if (err) {
      // Handle error appropriately
      return callback(err, null);
    }
    // Pass the row to the callback
    callback(null, row);
  });
};

const getUserByUUID = function (uuid, callback) {
  const query = 'SELECT * FROM user WHERE uuid = ?';
  db.get(query, [uuid], (err, row) => {
    if (err) {
      return callback(err);
    }

    // if (!row) {
    //   callback(null, null)
    // }
    callback(null, row);
  });
};

const addUser = function (userPayload, callback) {

  const query = 'INSERT INTO user (uuid, fullname, username, email, password, created_on, modified_on) VALUES (?, ?, ?, ?, ?, ?, ?)';
  console.log('userPayload :: ', userPayload);
  const params = [
    userPayload.uuid,
    userPayload.fullname,
    userPayload.username,
    userPayload.email,
    userPayload.password,
    userPayload.created_on,
    userPayload.modified_on
  ];


  db.run(query, params, function (err) {
    if (err) {
      // Handle error appropriately
      console.log('err :: ', err);
      return callback(err, null);
    }
    // Pass the ID of the newly created user to the callback
    callback(null, userPayload);
  });
};

const updateUser = function (uuid, userPayload, callback) {
  const { fullname, username, email, modified_on } = userPayload;
  const updates = [];
  const params = [];

  if (fullname) {
    updates.push('fullname = ?');
    params.push(fullname);
  }
  if (username) {
    updates.push('username = ?');
    params.push(username);
  }
  if (email) {
    updates.push('email = ?');
    params.push(email);
  }

  if (modified_on) {
    updates.push('modified_on = ?');
    params.push(modified_on);
  }

  if (updates.length === 0) {
    return callback(null, null); // No updates to make
  }

  const query = `UPDATE user SET ${updates.join(', ')} WHERE uuid = ?`;
  params.push(uuid); // Add uuid to the parameters

  db.run(query, params, function (err) {
    if (err) {
      return callback(err);
    }

    // Check if any row was updated
    if (this.changes === 0) {
      return callback(null, null); // No user found with that UUID
    }

    // Fetch the updated user to return
    getUserByUUID(uuid, callback); // Fetch the updated user data
  });
};

const deleteUser = function (uuid, callback) {
  const query = 'DELETE FROM user WHERE uuid = ?';

  db.run(query, [uuid], function (err) {
    if (err) {
      // Handle error appropriately
      console.log('err :: ', err);
      return callback(err, null);
    }
    // Check if any rows were deleted
    if (this.changes === 0) {
      // No user was found with the provided UUID
      return callback(null, null); // Or callback(null, { message: 'User not found' });
    }

    // Pass a success message or the UUID of the deleted user to the callback
    callback(null, { message: `User ${uuid} deleted successfully`, uuid });
  });
};

const getAllChannels = function (callback) {
  db.all('SELECT * FROM channel', [], (err, rows) => {
    callback(err, rows);
  });
};

const getChannelByUUID = function (uuid, callback) {
  const query = 'SELECT * FROM channel WHERE uuid = ?';
  db.get(query, [uuid], (err, row) => {
    if (err) {
      return callback(err);
    }

    row.user_uuids = JSON.parse(row.user_uuids)

    callback(null, row);
  });
};

const getChannelsByUserUuid = function (userUuid, callback) {
  const query = `
    SELECT * FROM channel
    WHERE instr(user_uuids, ?) > 0`;

  // This parameter assumes the UUID is stored in a JSON-like string with quotes
  const parameter = `"${userUuid}"`; // Matches the UUID with quotes

  db.all(query, [parameter], (err, rows) => {
    if (err) {
      console.error('Error fetching channels for user UUID:', err);
      return callback(err, null);
    }
    callback(null, rows);
  });
};

const addChannel = function (channelPayload, callback) {

  const query = 'INSERT INTO channel (uuid, name, user_uuids, type, created_on, modified_on) VALUES (?, ?, ?, ?, ?, ?)';
  console.log('userPayload :: ', channelPayload);

  const params = [
    channelPayload.uuid,
    channelPayload.name,
    channelPayload.user_uuids,
    channelPayload.type,
    channelPayload.created_on,
    channelPayload.modified_on
  ];

  db.run(query, params, function (err) {
    if (err) {
      // Handle error appropriately
      console.log('err :: ', err);
      return callback(err, null);
    }
    // Pass the ID of the newly created user to the callback
    callback(null, channelPayload);
  });
};

const updateChannel = function (uuid, channelPayload, callback) {
  const { name, user_uuids, type } = channelPayload;
  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }

  if (user_uuids) {
    updates.push('user_uuids = ?');
    params.push(user_uuids);
  }

  if (type) {
    updates.push('type = ?');
    params.push(type);
  }

  if (updates.length === 0) {
    return callback(null, null); // No updates to make
  }

  const query = `UPDATE channel SET ${updates.join(', ')} WHERE uuid = ?`;
  params.push(uuid); // Add uuid to the parameters

  db.run(query, params, function (err) {
    if (err) {
      return callback(err);
    }

    // Check if any row was updated
    if (this.changes === 0) {
      return callback(null, null); // No user found with that UUID
    }

    // Fetch the updated user to return
    getChannelByUUID(uuid, callback); // Fetch the updated user data
  });
};

const deleteChannel = function (uuid, callback) {
  const query = 'DELETE FROM channel WHERE uuid = ?';

  db.run(query, [uuid], function (err) {
    if (err) {
      // Handle error appropriately
      console.log('err :: ', err);
      return callback(err, null);
    }
    // Check if any rows were deleted
    if (this.changes === 0) {
      // No user was found with the provided UUID
      return callback(null, null); // Or callback(null, { message: 'User not found' });
    }

    // Pass a success message or the UUID of the deleted user to the callback
    callback(null, { message: `Channel ${uuid} deleted successfully`, uuid });
  });
};

const getAllMessages = function (callback) {
  db.all('SELECT * FROM message', [], (err, rows) => {
    callback(err, rows);
  });
};

const getMessageByUuid = function (uuid, callback) {
  const query = 'SELECT * FROM message WHERE uuid = ?';
  db.get(query, [uuid], (err, row) => {
    if (err) {
      return callback(err);
    }

    callback(null, row);
  });
};

const addMessage = function (messagePayload, callback) {

  const query = 'INSERT INTO message (uuid, channel_uuid, user_uuid, message, created_on, modified_on) VALUES (?, ?, ?, ?, ?, ?)';
  console.log('userPayload :: ', messagePayload);

  const params = [
    messagePayload.uuid,
    messagePayload.channel_uuid,
    messagePayload.user_uuid,
    messagePayload.message,
    messagePayload.created_on,
    messagePayload.modified_on
  ];

  db.run(query, params, function (err) {
    if (err) {
      // Handle error appropriately
      console.log('err :: ', err);
      return callback(err, null);
    }
    // Pass the ID of the newly created user to the callback
    callback(null, messagePayload);
  });
};

const updateMessage = function (uuid, messagePayload, callback) {
  const { message } = messagePayload;
  const updates = [];
  const params = [];

  if (message) {
    updates.push('message = ?');
    params.push(message);
  }

  if (modified_on) {
    updates.push('modified_on = ?');
    params.push(modified_on);
  }

  if (updates.length === 0) {
    return callback(null, null); // No updates to make
  }

  const query = `UPDATE message SET ${updates.join(', ')} WHERE uuid = ?`;
  params.push(uuid); // Add uuid to the parameters

  db.run(query, params, function (err) {
    if (err) {
      return callback(err);
    }

    // Check if any row was updated
    if (this.changes === 0) {
      return callback(null, null); // No user found with that UUID
    }

    // Fetch the updated user to return
    getMessageByUuid(uuid, callback); // Fetch the updated user data
  });
};

const deleteMessage = function (uuid, callback) {
  const query = 'DELETE FROM message WHERE uuid = ?';

  db.run(query, [uuid], function (err) {
    if (err) {
      // Handle error appropriately
      console.log('err :: ', err);
      return callback(err, null);
    }
    // Check if any rows were deleted
    if (this.changes === 0) {
      // No user was found with the provided UUID
      return callback(null, null); // Or callback(null, { message: 'User not found' });
    }

    // Pass a success message or the UUID of the deleted user to the callback
    callback(null, { message: `Message ${uuid} deleted successfully`, uuid });
  });
};

const getMessageByChannel = function (uuid, callback) {
  const query = 'SELECT * FROM message WHERE channel_uuid = ?';
  db.all(query, [uuid], (err, row) => {
    if (err) {
      return callback(err);
    }

    callback(null, row);
  });
};




module.exports = {
  getAllUsers,
  getUserByEmail,
  getUserByUsername,
  getUserByUUID,
  addUser,
  updateUser,
  deleteUser,
  getAllChannels,
  getChannelByUUID,
  getChannelsByUserUuid,
  addChannel,
  updateChannel,
  deleteChannel,
  getAllMessages,
  getMessageByUuid,
  addMessage,
  updateMessage,
  deleteMessage,
  getMessageByChannel
};
