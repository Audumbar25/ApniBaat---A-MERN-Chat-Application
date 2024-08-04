const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); // Adjust the path as per your project structure
const Message = require('./models/Message'); // Adjust the path as per your project structure
const ws = require('ws');
const fs = require('fs');
const path = require('path');


dotenv.config();
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin: 'http://localhost:5173', // Update with your frontend URL
}));

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, (err, userData) => {
        if (err) return reject(err);
        resolve(userData);
      });
    } else {
      reject('No token');
    }
  });
}

app.get('/test', (req, res) => {
  res.json('test ok');
});

app.get('/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
      sender: { $in: [userId, ourUserId] },
      recipient: { $in: [userId, ourUserId] },
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.get('/people', async (req, res) => {
  try {
    const users = await User.find({}, { '_id': 1, username: 1 });
    res.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/profile', (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, (err, userData) => {
      if (err) {
        console.error('Invalid token:', err);
        return res.status(401).json('Invalid token');
      }
      res.json(userData);
    });
  } else {
    res.status(401).json('No token');
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const foundUser = await User.findOne({ username });
    if (foundUser) {
      const passOk = bcrypt.compareSync(password, foundUser.password);
      if (passOk) {
        jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
          if (err) {
            console.error('Failed to generate token:', err);
            return res.status(500).json('Failed to generate token');
          }
          res.cookie('token', token, { sameSite: 'none', secure: true }).json({
            id: foundUser._id,
          });
        });
      } else {
        res.status(401).json('Invalid password');
      }
    } else {
      res.status(401).json('User not found');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json('Error logging in');
  }
});

app.post('/logout', (req, res) => {
  res.cookie('token', '', { sameSite: 'none', secure: true }).json('ok');
});

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({
      username: username,
      password: hashedPassword,
    });
    jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
      if (err) {
        console.error('Failed to generate token:', err);
        return res.status(500).json('Failed to generate token');
      }
      res.cookie('token', token, { sameSite: 'none', secure: true }).status(201).json({
        id: createdUser._id,
      });
    });
  } catch (err) {
    console.error('Error registering:', err);
    res.status(500).json('Error registering');
  }
});

const server = app.listen(4040);

const wss = new ws.WebSocketServer({ server });
wss.on('connection', (connection, req) => {
  function notifyAboutOnlinePeople() {
    const onlinePeople = [...wss.clients].map(c => ({ userId: c.userId, username: c.username }));
    [...wss.clients].forEach(client => {
      client.send(JSON.stringify({ online: onlinePeople }));
    });
  }

  connection.isAlive = true;

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
      console.log('Connection terminated due to inactivity');
    }, 10000);
  }, 15000);

  connection.on('pong', () => {
    clearTimeout(connection.deathTimer);
  });

  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies.split(';').find(str => str.trim().startsWith('token='));
    if (tokenCookieString) {
      const token = tokenCookieString.split('=')[1];
      if (token) {
        jwt.verify(token, jwtSecret, (err, userData) => {
          if (err) {
            console.error('Token verification error:', err);
            return;
          }
          const { userId, username } = userData;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }

  connection.on('message', async (message) => {
    try {
      const messageData = JSON.parse(message.toString());
      const { recipient, text, file } = messageData;

      // Handle file upload if present
      let filename = null;
      if (file) {
        // Process file upload and save to server
        const parts = file.name.split('.');
        const ext = parts[parts.length - 1];
        filename = Date.now() + '.' + ext;
        const filepath = path.join(__dirname, '/uploads', filename);
        const bufferData = Buffer.from(file.data, 'base64');
        fs.writeFile(filepath, bufferData, (err) => {
          if (err) {
            console.error('Error saving file:', err);
          } else {
            console.log('File saved:', filepath);
          }
        });
      }

      // Create message document in database
      if (recipient && (text || file)) {
        const messageDoc = await Message.create({
          sender: connection.userId,
          recipient,
          text,
          file: file ? filename : null,
        });
        console.log('Created message:', messageDoc);

        // Broadcast message to recipient client(s)
        [...wss.clients]
          .filter(c => c.userId === recipient)
          .forEach(c => {
            c.send(JSON.stringify({
              text,
              sender: connection.userId,
              recipient,
              file: file ? { name: file.name, data: file.data } : null,
              _id: messageDoc._id,
              createdAt: messageDoc.createdAt,
            }));
          });
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  notifyAboutOnlinePeople();
});
