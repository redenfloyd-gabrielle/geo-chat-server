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
        created_on INTEGER NOT NULL,
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
  db.all('SELECT uuid, fullname, email, username, created_on, modified_on FROM user', [], (err, rows) => {
    callback(err, rows);
  });
};

const getUserByEmail = function (email, callback) {
  const query = 'SELECT uuid, fullname, email, username, created_on, modified_on FROM user WHERE email = ?';

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
  const query = 'SELECT uuid, fullname, email, username, created_on, modified_on FROM user WHERE uuid = ?';
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
  const selectQuery = 'SELECT uuid, fullname, email, username, created_on, modified_on FROM user WHERE uuid = ?';
  const deleteQuery = 'DELETE FROM user WHERE uuid = ?';

  // Fetch the user data first
  db.get(selectQuery, [uuid], (err, user) => {
    if (err) {
      console.log('Error fetching user: ', err);
      return callback(err, null);
    }
    if (!user) {
      // No user found with the provided UUID
      return callback(null, null);
    }

    // Proceed to delete the user
    db.run(deleteQuery, [uuid], function (err) {
      if (err) {
        console.log('Error deleting user: ', err);
        return callback(err, null);
      }
      if (this.changes === 0) {
        // No rows were deleted (unlikely if the user was fetched successfully)
        return callback(null, null);
      }

      // Include the deleted user's data in the callback
      callback(null, { message: `User ${uuid} deleted successfully`, user });
    });
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
  const { name, user_uuids, type, modified_on } = channelPayload;
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

  if (modified_on) {
    updates.push('modified_on = ?');
    params.push(modified_on);
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
  const selectQuery = 'SELECT * FROM channel WHERE uuid = ?';
  const deleteQuery = 'DELETE FROM channel WHERE uuid = ?';

  // Fetch the user data first
  db.get(selectQuery, [uuid], (err, channel) => {
    if (err) {
      console.log('Error fetching user: ', err);
      return callback(err, null);
    }
    if (!channel) {
      // No user found with the provided UUID
      return callback(null, null);
    }

    // Proceed to delete the user
    db.run(deleteQuery, [uuid], function (err) {
      if (err) {
        console.log('Error deleting channel: ', err);
        return callback(err, null);
      }
      if (this.changes === 0) {
        // No rows were deleted (unlikely if the user was fetched successfully)
        return callback(null, null);
      }

      // Include the deleted user's data in the callback
      callback(null, { message: `Channel ${uuid} deleted successfully`, channel });
    });
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
  const { message, modified_on } = messagePayload;
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
  const selectQuery = 'SELECT * FROM message WHERE uuid = ?';
  const deleteQuery = 'DELETE FROM message WHERE uuid = ?';

  // Fetch the user data first
  db.get(selectQuery, [uuid], (err, message) => {
    if (err) {
      console.log('Error fetching user: ', err);
      return callback(err, null);
    }
    if (!message) {
      // No user found with the provided UUID
      return callback(null, null);
    }

    // Proceed to delete the user
    db.run(deleteQuery, [uuid], function (err) {
      if (err) {
        console.log('Error deleting message: ', err);
        return callback(err, null);
      }
      if (this.changes === 0) {
        // No rows were deleted (unlikely if the user was fetched successfully)
        return callback(null, null);
      }

      // Include the deleted user's data in the callback
      callback(null, { message: `Message ${uuid} deleted successfully`, message });
    });
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

const getAllLocations = function (callback) {
  db.all('SELECT * FROM location', [], (err, rows) => {
    callback(err, rows);
  });
};


const getLocationByUuid = function (uuid, callback) {
  const query = 'SELECT * FROM location WHERE uuid = ?';
  db.get(query, [uuid], (err, row) => {
    if (err) {
      return callback(err);
    }
    callback(null, row);
  });
};

const getLocationByUser = function (userUuid, callback) {
  const query = 'SELECT * FROM location WHERE user_uuid = ?';
  db.get(query, [userUuid], (err, row) => {
    if (err) {
      return callback(err);
    }
    callback(null, row);
  });
};

const addLocation = function (locationPayload, callback) {

  const query = 'INSERT INTO location (uuid, channel_uuid, user_uuid, latitude, longitude, created_on, modified_on) VALUES (?, ?, ?, ?, ?, ?, ?)';
  console.log('userPayload :: ', locationPayload);

  const params = [
    locationPayload.uuid,
    locationPayload.channel_uuid,
    locationPayload.user_uuid,
    locationPayload.latitude,
    locationPayload.longitude,
    locationPayload.created_on,
    locationPayload.modified_on
  ];

  db.run(query, params, function (err) {
    if (err) {
      // Handle error appropriately
      console.log('err :: ', err);
      return callback(err, null);
    }
    // Pass the ID of the newly created user to the callback
    callback(null, locationPayload);
  });
};

const updateLocation = function (uuid, locationPayload, callback) {
  const { latitude, longitude, modified_on } = locationPayload;
  const updates = [];
  const params = [];

  if (latitude) {
    updates.push('latitude = ?');
    params.push(latitude);
  }

  if (longitude) {
    updates.push('longitude = ?');
    params.push(longitude);
  }

  if (modified_on) {
    updates.push('modified_on = ?');
    params.push(modified_on);
  }

  if (updates.length === 0) {
    return callback(null, null); // No updates to make
  }

  const query = `UPDATE location SET ${updates.join(', ')} WHERE uuid = ?`;
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
    getLocationByUuid(uuid, callback); // Fetch the updated user data
  });
};

const deleteLocation = function (uuid, callback) {
  const selectQuery = 'SELECT * FROM location WHERE uuid = ?';
  const deleteQuery = 'DELETE FROM location WHERE uuid = ?';

  // Fetch the user data first
  db.get(selectQuery, [uuid], (err, location) => {
    if (err) {
      console.log('Error fetching user: ', err);
      return callback(err, null);
    }
    if (!location) {
      // No user found with the provided UUID
      return callback(null, null);
    }

    // Proceed to delete the user
    db.run(deleteQuery, [uuid], function (err) {
      if (err) {
        console.log('Error deleting location: ', err);
        return callback(err, null);
      }
      if (this.changes === 0) {
        // No rows were deleted (unlikely if the user was fetched successfully)
        return callback(null, null);
      }

      // Include the deleted user's data in the callback
      callback(null, { message: `Location ${uuid} deleted successfully`, location });
    });
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
  getMessageByChannel,
  addMessage,
  updateMessage,
  deleteMessage,
  getAllLocations,
  getLocationByUuid,
  getLocationByUser,
  addLocation,
  updateLocation,
  deleteLocation
};
