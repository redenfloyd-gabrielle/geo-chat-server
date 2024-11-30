const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create SQLite database (memory or persistent file)
const db = new sqlite3.Database('chat-geo-database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    createTables()
  }
});

const createTables = function () {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS user (
      uuid TEXT PRIMARY KEY,
      fullname TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      image_url TEXT,
      created_on INTEGER NOT NULL,
      modified_on INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS channel (
      uuid TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      user_uuids TEXT NOT NULL,
      type TEXT CHECK(type IN ('Group', 'Direct Message')),
      created_on INTEGER NOT NULL,
      modified_on INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS message (
      uuid TEXT PRIMARY KEY,
      channel_uuid TEXT NOT NULL,
      user_uuid TEXT NOT NULL,
      message TEXT NOT NULL,
      created_on INTEGER NOT NULL,
      modified_on INTEGER NOT NULL,
      FOREIGN KEY (channel_uuid) REFERENCES channel(uuid),
      FOREIGN KEY (user_uuid) REFERENCES user(uuid)
    );
    CREATE TABLE IF NOT EXISTS location (
      uuid TEXT PRIMARY KEY,
      channel_uuid TEXT NOT NULL,
      user_uuid TEXT NOT NULL,
      latitude INTEGER NOT NULL,
      longitude INTEGER NOT NULL,
      weather TEXT,
      created_on INTEGER NOT NULL,
      modified_on INTEGER NOT NULL,
      FOREIGN KEY (channel_uuid) REFERENCES channel(uuid),
      FOREIGN KEY (user_uuid) REFERENCES user(uuid)
    );
    CREATE TABLE IF NOT EXISTS friendship (
      uuid TEXT PRIMARY KEY,
      user1_uuid TEXT NOT NULL,
      user2_uuid TEXT NOT NULL,
      status TEXT CHECK (status IN ('Pending', 'Accepted', 'Blocked')),
      created_on INTEGER NOT NULL,
      modified_on INTEGER NOT NULL,
      FOREIGN KEY (user1_uuid) REFERENCES user(uuid),
      FOREIGN KEY (user2_uuid) REFERENCES user(uuid)
    );
  `, (err) => {
    if (err) {
      console.error('Error creating tables:', err.message);
    } else {
      console.log('Database tables initialized successfully.');
    }
  });
}

const getAllUsers = function (callback) {
  db.all('SELECT uuid, fullname, email, username, image_url, created_on, modified_on FROM user', [], (err, rows) => {
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
  const query = 'SELECT uuid, fullname, email, username, image_url, created_on, modified_on FROM user WHERE uuid = ?';
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

  const query = 'INSERT INTO user (uuid, fullname, username, email, password, image_url, created_on, modified_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  console.log('userPayload :: ', userPayload);
  const params = [
    userPayload.uuid,
    userPayload.fullname,
    userPayload.username,
    userPayload.email,
    userPayload.password,
    userPayload.image_url,
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
  const { fullname, username, email, modified_on, image_url } = userPayload;
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

  if (image_url) {
    updates.push('image_url = ?');
    params.push(image_url);
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


    db.run(deleteQuery, [uuid], function (err) {
      if (err) {
        console.log('Error deleting user: ', err);
        return callback(err, null);
      }
      if (this.changes === 0) {
        // No rows were deleted (unlikely if the user was fetched successfully)
        return callback(null, null);
      }


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
    SELECT *
    FROM channel
    WHERE instr(user_uuids, ?) > 0
  `;

  // This parameter assumes the UUID is stored in a JSON-like string with quotes
  const parameter = `"${userUuid}"`; // Matches the UUID with quotes

  db.all(query, [parameter], (err, rows) => {
    if (err) {
      console.error('Error fetching channels for user UUID:', err);
      return callback(err, null);
    }

    if (rows.length === 0) {
      return callback(null, []); // Return empty array if no channels found
    }

    // Parse `user_uuids` from each channel and fetch user details
    const allUserUuids = Array.from(
      new Set(
        rows.flatMap(row => JSON.parse(row.user_uuids)) // Parse and flatten user_uuids
      )
    );

    const userQuery = `
      SELECT uuid, fullname, email, username, created_on, modified_on
      FROM "user"
      WHERE uuid IN (${allUserUuids.map(() => '?').join(', ')});
    `;

    db.all(userQuery, allUserUuids, (userErr, userRows) => {
      if (userErr) {
        console.error('Error fetching user details:', userErr);
        return callback(userErr, null);
      }
      console.log('user rows::', userRows)
      // Map each channel to include its user details, excluding null values
      const result = rows.map(channel => ({
        ...channel,
        users: JSON.parse(channel.user_uuids)
          .map(uuid => userRows.find(user => user.uuid === uuid))
          .filter(user => user)
      }));

      callback(null, result);
    });
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
    console.log('@___ channel :: ', channel)
    if (!channel) {
      return callback(null, null);
    }

    db.run(deleteQuery, [uuid], function (err) {
      if (err) {
        console.log('Error deleting channel: ', err);
        return callback(err, null);
      }
      if (this.changes === 0) {
        // No rows were deleted (unlikely if the user was fetched successfully)
        return callback(null, null);
      }
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
  const query = `
    SELECT
        m.uuid AS message_uuid,
        m.message,
        m.created_on AS message_created_on,
        m.modified_on AS message_modified_on,
        c.uuid AS channel_uuid,
        c.name AS channel_name,
        c.type AS channel_type,
        c.user_uuids AS channel_user_uuids,
        c.created_on AS channel_created_on,
        c.modified_on AS channel_modified_on,
        u.uuid AS user_uuid,
        u.fullname AS user_fullname,
        u.email AS user_email,
        u.username AS user_username,
        u.created_on AS user_created_on,
        u.modified_on AS user_modified_on
    FROM message m
    JOIN channel c ON m.channel_uuid = c.uuid
    JOIN "user" u ON m.user_uuid = u.uuid
    WHERE m.uuid = ?
    ORDER BY m.created_on;
  `;
  // const query = 'SELECT * FROM message WHERE uuid = ?';
  db.get(query, [uuid], (err, row) => {
    if (err) {
      return callback(err);
    }

    // Reshape the result
    const transformedResult = {
      uuid: row.message_uuid,
      channel_uuid: row.channel_uuid,
      channel: {
        uuid: row.channel_uuid,
        name: row.channel_name,
        type: row.channel_type,
        user_uuids: JSON.parse(row.channel_user_uuids),
        created_on: row.channel_created_on,
        modified_on: row.channel_modified_on,
      },
      user_uuid: row.user_uuid,
      user: {
        uuid: row.user_uuid,
        fullname: row.user_fullname,
        email: row.user_email,
        username: row.user_username,
        created_on: row.user_created_on,
        modified_on: row.user_modified_on,
      },
      message: row.message,
      created_on: row.message_created_on,
      modified_on: row.message_modified_on,
    };

    callback(null, transformedResult);
  });
};

// const addMessage = function (messagePayload, callback) {

//   const query = 'INSERT INTO message (uuid, channel_uuid, user_uuid, message, created_on, modified_on) VALUES (?, ?, ?, ?, ?, ?)';
//   console.log('userPayload :: ', messagePayload);

//   const params = [
//     messagePayload.uuid,
//     messagePayload.channel_uuid,
//     messagePayload.user_uuid,
//     messagePayload.message,
//     messagePayload.created_on,
//     messagePayload.modified_on
//   ];

//   db.run(query, params, function (err) {
//     if (err) {
//       // Handle error appropriately
//       console.log('err :: ', err);
//       return callback(err, null);
//     }
//     // Pass the ID of the newly created user to the callback
//     callback(null, messagePayload);
//   });
// };

const addMessage = function (messagePayload, callback) {
  const query = `
    INSERT INTO message (uuid, channel_uuid, user_uuid, message, created_on, modified_on) 
    VALUES (?, ?, ?, ?, ?, ?)`;

  console.log('messagePayload :: ', messagePayload);

  // Prepare the parameters for the query
  const params = [
    messagePayload.uuid,
    messagePayload.channel_uuid,
    messagePayload.user_uuid,
    messagePayload.message,
    messagePayload.created_on,
    messagePayload.modified_on,
  ];

  db.run(query, params, function (err) {
    if (err) {
      // Handle error appropriately
      console.log('err :: ', err);
      return callback(err, null);
    }

    // Call getMessageByUuid after a successful insert
    getMessageByUuid(messagePayload.uuid, (err, messageDetails) => {
      if (err) {
        console.log('Error fetching message details :: ', err);
        return callback(err, null);
      }

      // Pass the detailed message information to the callback
      callback(null, messageDetails);
    });
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

  console.log('@___ updates', updates)
  console.log('@___ params', params)

  if (updates.length === 0) {
    return callback(null, { error: 'No fields to update' });
  }

  const query = `UPDATE message SET ${updates.join(', ')} WHERE uuid = ?`;
  params.push(uuid);

  db.run(query, params, function (err) {
    if (err) {
      return callback(err);
    }

    console.log('@___ this.changes', this.changes); // Debug: number of rows affected
    if (this.changes === 0) {
      return callback(null, { error: 'No message found with the given UUID' });
    }

    // Fetch and return the updated message
    getMessageByUuid(uuid, callback);
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


    db.run(deleteQuery, [uuid], function (err) {
      if (err) {
        console.log('Error deleting message: ', err);
        return callback(err, null);
      }
      if (this.changes === 0) {
        // No rows were deleted (unlikely if the user was fetched successfully)
        return callback(null, null);
      }


      callback(null, { message: `Message ${uuid} deleted successfully`, data: message });
    });
  });
};

const getMessageByChannel = function (uuid, callback) {
  const query = `
    SELECT
        m.uuid AS message_uuid,
        m.message,
        m.created_on AS message_created_on,
        m.modified_on AS message_modified_on,
        c.uuid AS channel_uuid,
        c.name AS channel_name,
        c.type AS channel_type,
        c.user_uuids AS channel_user_uuids,
        c.created_on AS channel_created_on,
        c.modified_on AS channel_modified_on,
        u.uuid AS user_uuid,
        u.fullname AS user_fullname,
        u.email AS user_email,
        u.username AS user_username,
        u.created_on AS user_created_on,
        u.modified_on AS user_modified_on
    FROM message m
    JOIN channel c ON m.channel_uuid = c.uuid
    JOIN "user" u ON m.user_uuid = u.uuid
    WHERE m.channel_uuid = ?
    ORDER BY m.created_on;
  `;
  db.all(query, [uuid], (err, rows) => {
    if (err) {
      return callback(err);
    }

    // Parse the channel_user_uuids for additional user details
    if (rows.length > 0) {
      const channelUserUuids = JSON.parse(rows[0].channel_user_uuids);

      // Query additional user details
      const userQuery = `
        SELECT uuid, fullname, email, username, created_on, modified_on
        FROM "user"
        WHERE uuid IN (${channelUserUuids.map(() => '?').join(',')});
      `;

      db.all(userQuery, channelUserUuids, (userErr, userRows) => {
        if (userErr) {
          return callback(userErr);
        }

        // Transform the original rows with the additional user data
        const result = rows.map(row => ({
          uuid: row.message_uuid,
          message: row.message,
          created_on: row.message_created_on,
          modified_on: row.message_modified_on,
          channel: {
            uuid: row.channel_uuid,
            name: row.channel_name,
            type: row.channel_type,
            user_uuids: channelUserUuids,
            users: userRows, // Add the user details here
            created_on: row.channel_created_on,
            modified_on: row.channel_modified_on
          },
          user: {
            uuid: row.user_uuid,
            fullname: row.user_fullname,
            email: row.user_email,
            username: row.user_username,
            created_on: row.user_created_on,
            modified_on: row.user_modified_on
          }
        }));

        callback(null, result);
      });
    } else {
      // No rows found, return empty result
      callback(null, []);
    }
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

const getLocationByChannel = function (channelUuid, callback) {
  const query = 'SELECT * FROM location WHERE channel_uuid = ?';
  db.all(query, [channelUuid], (err, row) => {
    if (err) {
      return callback(err);
    }
    callback(null, row || []);
  });
};

const addLocation = function (locationPayload, callback) {

  const query = 'INSERT INTO location (uuid, channel_uuid, user_uuid, latitude, longitude, weather, created_on, modified_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  console.log('userPayload :: ', locationPayload);

  const params = [
    locationPayload.uuid,
    locationPayload.channel_uuid,
    locationPayload.user_uuid,
    locationPayload.latitude,
    locationPayload.longitude,
    locationPayload.weather,
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
  const { user_uuid, latitude, longitude, weather, modified_on } = locationPayload;
  const updates = [];
  const params = [];

  if (user_uuid) {
    updates.push('user_uuid = ?');
    params.push(user_uuid);
  }
  if (latitude) {
    updates.push('latitude = ?');
    params.push(latitude);
  }

  if (longitude) {
    updates.push('longitude = ?');
    params.push(longitude);
  }

  if (weather) {
    updates.push('weather = ?');
    params.push(weather);
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


    db.run(deleteQuery, [uuid], function (err) {
      if (err) {
        console.log('Error deleting location: ', err);
        return callback(err, null);
      }
      if (this.changes === 0) {
        // No rows were deleted (unlikely if the user was fetched successfully)
        return callback(null, null);
      }


      callback(null, { message: `Location ${uuid} deleted successfully`, location });
    });
  });
};

const addFriendship = function (friendshipPayload, callback) {

  const query = 'INSERT INTO friendship (uuid, user1_uuid, user2_uuid, status, created_on, modified_on) VALUES (?, ?, ?, ?, ?, ?)';
  console.log('userPayload :: ', friendshipPayload);

  const params = [
    friendshipPayload.uuid,
    friendshipPayload.user1_uuid,
    friendshipPayload.user2_uuid,
    friendshipPayload.status,
    friendshipPayload.created_on,
    friendshipPayload.modified_on
  ];

  db.run(query, params, function (err) {
    if (err) {
      // Handle error appropriately
      console.log('err :: ', err);
      return callback(err, null);
    }
    // Pass the ID of the newly created user to the callback
    callback(null, friendshipPayload);
  });
};

const getAllFriendships = function (callback) {
  const query = `
    SELECT
      f.uuid AS friendship_uuid,
      f.user1_uuid,
      f.user2_uuid,
      f.status,
      f.created_on,
      f.modified_on,
      u1.uuid AS user1_uuid,
      u1.fullname AS user1_fullname,
      u1.email AS user1_email,
      u1.username AS user1_username,
      u1.created_on AS user1_created_on,
      u1.modified_on AS user1_modified_on,
      u2.uuid AS user2_uuid,
      u2.fullname AS user2_fullname,
      u2.email AS user2_email,
      u2.username AS user2_username,
      u2.created_on AS user2_created_on,
      u2.modified_on AS user2_modified_on
    FROM friendship f
    JOIN "user" u1 ON f.user1_uuid = u1.uuid
    JOIN "user" u2 ON f.user2_uuid = u2.uuid
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return callback(err, null);
    }

    // Restructure the data into the desired format
    const friendsData = rows.map(row => ({
      uuid: row.friendship_uuid,
      user1_uuid: row.user1_uuid,
      user1: {
        uuid: row.user1_uuid,
        fullname: row.user1_fullname,
        email: row.user1_email,
        username: row.user1_username,
        created_on: row.user1_created_on,
        modified_on: row.user1_modified_on
      },
      user2_uuid: row.user2_uuid,
      user2: {
        uuid: row.user2_uuid,
        fullname: row.user2_fullname,
        email: row.user2_email,
        username: row.user2_username,
        created_on: row.user2_created_on,
        modified_on: row.user2_modified_on
      },
      status: row.status,
      created_on: row.created_on,
      modified_on: row.modified_on
    }));

    callback(null, friendsData);
  });
};

const getFriendshipByUuid = function (uuid, callback) {
  const query = `
    SELECT
      f.uuid AS friendship_uuid,
      f.user1_uuid,
      f.user2_uuid,
      f.status,
      f.created_on,
      f.modified_on,
      u1.uuid AS user1_uuid,
      u1.fullname AS user1_fullname,
      u1.email AS user1_email,
      u1.username AS user1_username,
      u1.created_on AS user1_created_on,
      u1.modified_on AS user1_modified_on,
      u2.uuid AS user2_uuid,
      u2.fullname AS user2_fullname,
      u2.email AS user2_email,
      u2.username AS user2_username,
      u2.created_on AS user2_created_on,
      u2.modified_on AS user2_modified_on
    FROM friendship f
    JOIN "user" u1 ON f.user1_uuid = u1.uuid
    JOIN "user" u2 ON f.user2_uuid = u2.uuid
    WHERE f.uuid = ?
  `;

  db.get(query, [uuid], (err, row) => {
    if (err) {
      return callback(err);
    }

    if (!row) {
      return callback(null, null);
    }

    // Restructure the row data into the desired format
    const friendData = {
      uuid: row.friendship_uuid,
      user1_uuid: row.user1_uuid,
      user1: {
        uuid: row.user1_uuid,
        fullname: row.user1_fullname,
        email: row.user1_email,
        username: row.user1_username,
        created_on: row.user1_created_on,
        modified_on: row.user1_modified_on
      },
      user2_uuid: row.user2_uuid,
      user2: {
        uuid: row.user2_uuid,
        fullname: row.user2_fullname,
        email: row.user2_email,
        username: row.user2_username,
        created_on: row.user2_created_on,
        modified_on: row.user2_modified_on
      },
      status: row.status,
      created_on: row.created_on,
      modified_on: row.modified_on
    };

    callback(null, friendData);
  });
};

const getFriendshipByUserUuid = function (uuid, callback) {
  const query = `
    SELECT
      f.uuid AS friendship_uuid,
      f.user1_uuid,
      f.user2_uuid,
      f.status,
      f.created_on,
      f.modified_on,
      u1.uuid AS user1_uuid,
      u1.fullname AS user1_fullname,
      u1.email AS user1_email,
      u1.username AS user1_username,
      u1.created_on AS user1_created_on,
      u1.modified_on AS user1_modified_on,
      u2.uuid AS user2_uuid,
      u2.fullname AS user2_fullname,
      u2.email AS user2_email,
      u2.username AS user2_username,
      u2.created_on AS user2_created_on,
      u2.modified_on AS user2_modified_on
    FROM friendship f
    JOIN "user" u1 ON f.user1_uuid = u1.uuid
    JOIN "user" u2 ON f.user2_uuid = u2.uuid
    WHERE f.user1_uuid = ? OR f.user2_uuid = ?
  `;

  db.all(query, [uuid, uuid], (err, rows) => {
    if (err) {
      return callback(err);
    }

    if (rows.length === 0) {
      return callback(null, []);
    }

    // Restructure the rows data into the desired format
    const friendData = rows.map(row => ({
      uuid: row.friendship_uuid,
      user1_uuid: row.user1_uuid,
      user1: {
        uuid: row.user1_uuid,
        fullname: row.user1_fullname,
        email: row.user1_email,
        username: row.user1_username,
        created_on: row.user1_created_on,
        modified_on: row.user1_modified_on
      },
      user2_uuid: row.user2_uuid,
      user2: {
        uuid: row.user2_uuid,
        fullname: row.user2_fullname,
        email: row.user2_email,
        username: row.user2_username,
        created_on: row.user2_created_on,
        modified_on: row.user2_modified_on
      },
      status: row.status,
      created_on: row.created_on,
      modified_on: row.modified_on
    }));

    callback(null, friendData);
  });
};

const updateFriendship = function (uuid, friendshipPayload, callback) {
  const { user1_uuid, user2_uuid, status, modified_on } = friendshipPayload;
  const updates = [];
  const params = [];

  if (user1_uuid) {
    updates.push('user1_uuid = ?');
    params.push(user1_uuid);
  }
  if (user2_uuid) {
    updates.push('user2_uuid = ?');
    params.push(user2_uuid);
  }
  if (status) {
    updates.push('status = ?');
    params.push(status);
  }

  if (modified_on) {
    updates.push('modified_on = ?');
    params.push(modified_on);
  }

  if (updates.length === 0) {
    return callback(null, null); // No updates to make
  }

  const query = `UPDATE friendship SET ${updates.join(', ')} WHERE uuid = ?`;
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
    getFriendshipByUuid(uuid, callback); // Fetch the updated user data
  });
};

const deleteFriendship = function (uuid, callback) {
  const selectQuery = 'SELECT * FROM friendship WHERE uuid = ?';
  const deleteQuery = 'DELETE FROM friendship WHERE uuid = ?';

  // Fetch the user data first
  db.get(selectQuery, [uuid], (err, friendship) => {
    if (err) {
      console.log('Error fetching user: ', err);
      return callback(err, null);
    }
    if (!friendship) {
      // No user found with the provided UUID
      return callback(null, null);
    }


    db.run(deleteQuery, [uuid], function (err) {
      if (err) {
        console.log('Error deleting friendship: ', err);
        return callback(err, null);
      }
      if (this.changes === 0) {
        // No rows were deleted (unlikely if the user was fetched successfully)
        return callback(null, null);
      }


      callback(null, { message: `Friendship ${uuid} deleted successfully`, friendship });
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
  getLocationByChannel,
  addLocation,
  updateLocation,
  deleteLocation,
  addFriendship,
  getAllFriendships,
  getFriendshipByUuid,
  getFriendshipByUserUuid,
  updateFriendship,
  deleteFriendship
};
