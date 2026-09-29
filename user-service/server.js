require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || process.env.USER_SERVICE_PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || process.env.USER_DB_URI;

app.use(cors());
app.use(express.json());

// In-Memory Data Store (Fallback & Instant Availability)
let inMemoryUsers = [
  {
    id: "101",
    name: "John Doe",
    email: "john@campus.edu",
    role: "Student",
    createdAt: new Date("2026-09-01T08:00:00Z")
  },
  {
    id: "102",
    name: "Jane Smith",
    email: "jane@campus.edu",
    role: "Instructor",
    createdAt: new Date("2026-09-02T09:00:00Z")
  }
];

// Mongoose Schema (for MongoDB persistence when URI is configured)
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, default: "Student" },
  createdAt: { type: Date, default: Date.now }
});

let UserModel = null;
let useMongoDB = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      useMongoDB = true;
      UserModel = mongoose.model('User', userSchema);
      console.log(`[User Service] Connected to MongoDB at ${MONGODB_URI}`);
    })
    .catch((err) => {
      console.warn(`[User Service] MongoDB connection failed: ${err.message}. Using in-memory store.`);
    });
} else {
  console.log('[User Service] MONGODB_URI not provided. Operating in high-reliability in-memory mode.');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'user-service',
    port: PORT,
    storage: useMongoDB ? 'MongoDB' : 'In-Memory',
    timestamp: new Date().toISOString()
  });
});

// GET /users - Retrieve all users
app.get('/users', async (req, res) => {
  try {
    if (useMongoDB && UserModel) {
      const users = await UserModel.find({}, { _id: 0, __v: 0 }).sort({ id: 1 });
      return res.status(200).json(users);
    }
    res.status(200).json(inMemoryUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// GET /users/:id - Retrieve user by ID
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (useMongoDB && UserModel) {
      const user = await UserModel.findOne({ id }, { _id: 0, __v: 0 });
      if (!user) {
        return res.status(404).json({ error: `User not found with ID: ${id}` });
      }
      return res.status(200).json(user);
    }

    const user = inMemoryUsers.find((u) => u.id === String(id));
    if (!user) {
      return res.status(404).json({ error: `User not found with ID: ${id}` });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  }
});

// POST /users - Create new user
app.post('/users', async (req, res) => {
  const { name, email, role, id } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Validation Error', message: 'Fields "name" and "email" are required.' });
  }

  const userId = id ? String(id) : String(Date.now());

  try {
    if (useMongoDB && UserModel) {
      const existing = await UserModel.findOne({ id: userId });
      if (existing) {
        return res.status(409).json({ error: `User with ID ${userId} already exists.` });
      }
      const newUser = await UserModel.create({
        id: userId,
        name,
        email,
        role: role || 'Student'
      });
      const userObj = newUser.toObject();
      delete userObj._id;
      delete userObj.__v;
      return res.status(201).json(userObj);
    }

    const existingInMemory = inMemoryUsers.find((u) => u.id === userId);
    if (existingInMemory) {
      return res.status(409).json({ error: `User with ID ${userId} already exists.` });
    }

    const newUser = {
      id: userId,
      name,
      email,
      role: role || 'Student',
      createdAt: new Date()
    };
    inMemoryUsers.push(newUser);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// PUT /users/:id - Update user
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;

  try {
    if (useMongoDB && UserModel) {
      const updatedUser = await UserModel.findOneAndUpdate(
        { id: String(id) },
        { name, email, role },
        { new: true, projection: { _id: 0, __v: 0 } }
      );
      if (!updatedUser) {
        return res.status(404).json({ error: `User not found with ID: ${id}` });
      }
      return res.status(200).json(updatedUser);
    }

    const index = inMemoryUsers.findIndex((u) => u.id === String(id));
    if (index === -1) {
      return res.status(404).json({ error: `User not found with ID: ${id}` });
    }

    if (name) inMemoryUsers[index].name = name;
    if (email) inMemoryUsers[index].email = email;
    if (role) inMemoryUsers[index].role = role;

    res.status(200).json(inMemoryUsers[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// DELETE /users/:id - Delete user
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    if (useMongoDB && UserModel) {
      const deletedUser = await UserModel.findOneAndDelete({ id: String(id) });
      if (!deletedUser) {
        return res.status(404).json({ error: `User not found with ID: ${id}` });
      }
      return res.status(200).json({ message: `User ${id} successfully deleted.` });
    }

    const index = inMemoryUsers.findIndex((u) => u.id === String(id));
    if (index === -1) {
      return res.status(404).json({ error: `User not found with ID: ${id}` });
    }

    inMemoryUsers.splice(index, 1);
    res.status(200).json({ message: `User ${id} successfully deleted.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[User Service] Running on port ${PORT}`);
});
