require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || process.env.ORDER_SERVICE_PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI || process.env.ORDER_DB_URI;

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

app.use(cors());
app.use(express.json());

// Seed Initial Orders
let inMemoryOrders = [
  {
    id: "901",
    userId: "101",
    productId: "501",
    quantity: 2,
    totalAmount: 99.98,
    status: "COMPLETED",
    user: { id: "101", name: "John Doe", email: "john@campus.edu" },
    product: { id: "501", name: "Campus Hoodie", price: 49.99 },
    createdAt: new Date("2026-09-02T10:00:00Z")
  }
];

// Mongoose Schema
const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  productId: { type: String, required: true },
  quantity: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: "COMPLETED" },
  user: {
    id: String,
    name: String,
    email: String
  },
  product: {
    id: String,
    name: String,
    price: Number
  },
  createdAt: { type: Date, default: Date.now }
});

let OrderModel = null;
let useMongoDB = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      useMongoDB = true;
      OrderModel = mongoose.model('Order', orderSchema);
      console.log(`[Order Service] Connected to MongoDB at ${MONGODB_URI}`);
    })
    .catch((err) => {
      console.warn(`[Order Service] MongoDB connection failed: ${err.message}. Using in-memory store.`);
    });
} else {
  console.log('[Order Service] MONGODB_URI not provided. Operating in high-reliability in-memory mode.');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'order-service',
    port: PORT,
    storage: useMongoDB ? 'MongoDB' : 'In-Memory',
    userServiceUrl: USER_SERVICE_URL,
    productServiceUrl: PRODUCT_SERVICE_URL,
    timestamp: new Date().toISOString()
  });
});

// GET /orders - Retrieve all orders
app.get('/orders', async (req, res) => {
  try {
    if (useMongoDB && OrderModel) {
      const orders = await OrderModel.find({}, { _id: 0, __v: 0 }).sort({ id: 1 });
      return res.status(200).json(orders);
    }
    res.status(200).json(inMemoryOrders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});

// GET /orders/:id - Retrieve order by ID
app.get('/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (useMongoDB && OrderModel) {
      const order = await OrderModel.findOne({ id }, { _id: 0, __v: 0 });
      if (!order) {
        return res.status(404).json({ error: `Order not found with ID: ${id}` });
      }
      return res.status(200).json(order);
    }

    const order = inMemoryOrders.find((o) => o.id === String(id));
    if (!order) {
      return res.status(404).json({ error: `Order not found with ID: ${id}` });
    }
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order', details: error.message });
  }
});

// POST /orders - Create order with Service-to-Service communication & error handling
app.post('/orders', async (req, res) => {
  const { userId, productId, quantity, id } = req.body;

  if (!userId || !productId || !quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Fields "userId", "productId", and positive numeric "quantity" are required.'
    });
  }

  let user = null;
  let product = null;

  // 1. Inter-Service Call: Fetch User details from User Service
  try {
    const userRes = await axios.get(`${USER_SERVICE_URL}/users/${userId}`, { timeout: 4000 });
    user = userRes.data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({
        error: 'User Not Found',
        message: `Referenced user with ID '${userId}' does not exist in User Service.`
      });
    }
    console.error(`[Order Service] Error communicating with User Service (${USER_SERVICE_URL}):`, err.message);
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'User Service is currently unreachable or unavailable.',
      targetUrl: `${USER_SERVICE_URL}/users/${userId}`,
      details: err.message
    });
  }

  // 2. Inter-Service Call: Fetch Product details from Product Service
  try {
    const productRes = await axios.get(`${PRODUCT_SERVICE_URL}/products/${productId}`, { timeout: 4000 });
    product = productRes.data;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({
        error: 'Product Not Found',
        message: `Referenced product with ID '${productId}' does not exist in Product Service.`
      });
    }
    console.error(`[Order Service] Error communicating with Product Service (${PRODUCT_SERVICE_URL}):`, err.message);
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Product Service is currently unreachable or unavailable.',
      targetUrl: `${PRODUCT_SERVICE_URL}/products/${productId}`,
      details: err.message
    });
  }

  // Calculate order total
  const qty = Number(quantity);
  const totalAmount = Number((product.price * qty).toFixed(2));
  const orderId = id ? String(id) : String(Date.now());

  const newOrder = {
    id: orderId,
    userId: String(userId),
    productId: String(productId),
    quantity: qty,
    totalAmount: totalAmount,
    status: 'COMPLETED',
    user: {
      id: String(user.id),
      name: user.name,
      email: user.email
    },
    product: {
      id: String(product.id),
      name: product.name,
      price: product.price
    },
    createdAt: new Date()
  };

  try {
    if (useMongoDB && OrderModel) {
      const existing = await OrderModel.findOne({ id: orderId });
      if (existing) {
        return res.status(409).json({ error: `Order with ID ${orderId} already exists.` });
      }
      const created = await OrderModel.create(newOrder);
      const createdObj = created.toObject();
      delete createdObj._id;
      delete createdObj.__v;
      return res.status(201).json(createdObj);
    }

    const existingInMemory = inMemoryOrders.find((o) => o.id === orderId);
    if (existingInMemory) {
      return res.status(409).json({ error: `Order with ID ${orderId} already exists.` });
    }

    inMemoryOrders.push(newOrder);
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Order Service] Running on port ${PORT}`);
  console.log(`[Order Service] Configured User Service URL: ${USER_SERVICE_URL}`);
  console.log(`[Order Service] Configured Product Service URL: ${PRODUCT_SERVICE_URL}`);
});
