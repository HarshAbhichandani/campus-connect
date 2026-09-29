require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || process.env.PRODUCT_SERVICE_PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI || process.env.PRODUCT_DB_URI;

app.use(cors());
app.use(express.json());

// In-Memory Data Store
let inMemoryProducts = [
  {
    id: "501",
    name: "Campus Hoodie",
    price: 49.99,
    category: "Apparel",
    stock: 100,
    createdAt: new Date("2026-09-01T08:00:00Z")
  },
  {
    id: "502",
    name: "Tech Backpack",
    price: 79.99,
    category: "Accessories",
    stock: 50,
    createdAt: new Date("2026-09-02T09:00:00Z")
  }
];

// Mongoose Schema
const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, default: "General" },
  stock: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

let ProductModel = null;
let useMongoDB = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      useMongoDB = true;
      ProductModel = mongoose.model('Product', productSchema);
      console.log(`[Product Service] Connected to MongoDB at ${MONGODB_URI}`);
    })
    .catch((err) => {
      console.warn(`[Product Service] MongoDB connection failed: ${err.message}. Using in-memory store.`);
    });
} else {
  console.log('[Product Service] MONGODB_URI not provided. Operating in high-reliability in-memory mode.');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'product-service',
    port: PORT,
    storage: useMongoDB ? 'MongoDB' : 'In-Memory',
    timestamp: new Date().toISOString()
  });
});

// GET /products - Retrieve all products
app.get('/products', async (req, res) => {
  try {
    if (useMongoDB && ProductModel) {
      const products = await ProductModel.find({}, { _id: 0, __v: 0 }).sort({ id: 1 });
      return res.status(200).json(products);
    }
    res.status(200).json(inMemoryProducts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

// GET /products/:id - Retrieve product by ID
app.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (useMongoDB && ProductModel) {
      const product = await ProductModel.findOne({ id }, { _id: 0, __v: 0 });
      if (!product) {
        return res.status(404).json({ error: `Product not found with ID: ${id}` });
      }
      return res.status(200).json(product);
    }

    const product = inMemoryProducts.find((p) => p.id === String(id));
    if (!product) {
      return res.status(404).json({ error: `Product not found with ID: ${id}` });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product', details: error.message });
  }
});

// POST /products - Create new product
app.post('/products', async (req, res) => {
  const { name, price, category, stock, id } = req.body;

  if (!name || price === undefined || price === null || isNaN(Number(price))) {
    return res.status(400).json({ error: 'Validation Error', message: 'Fields "name" and valid numeric "price" are required.' });
  }

  const productId = id ? String(id) : String(Date.now());

  try {
    if (useMongoDB && ProductModel) {
      const existing = await ProductModel.findOne({ id: productId });
      if (existing) {
        return res.status(409).json({ error: `Product with ID ${productId} already exists.` });
      }
      const newProduct = await ProductModel.create({
        id: productId,
        name,
        price: Number(price),
        category: category || 'General',
        stock: stock !== undefined ? Number(stock) : 10
      });
      const productObj = newProduct.toObject();
      delete productObj._id;
      delete productObj.__v;
      return res.status(201).json(productObj);
    }

    const existingInMemory = inMemoryProducts.find((p) => p.id === productId);
    if (existingInMemory) {
      return res.status(409).json({ error: `Product with ID ${productId} already exists.` });
    }

    const newProduct = {
      id: productId,
      name,
      price: Number(price),
      category: category || 'General',
      stock: stock !== undefined ? Number(stock) : 10,
      createdAt: new Date()
    };
    inMemoryProducts.push(newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
});

// PUT /products/:id - Update product
app.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, category, stock } = req.body;

  try {
    if (useMongoDB && ProductModel) {
      const updateFields = {};
      if (name) updateFields.name = name;
      if (price !== undefined) updateFields.price = Number(price);
      if (category) updateFields.category = category;
      if (stock !== undefined) updateFields.stock = Number(stock);

      const updatedProduct = await ProductModel.findOneAndUpdate(
        { id: String(id) },
        updateFields,
        { new: true, projection: { _id: 0, __v: 0 } }
      );
      if (!updatedProduct) {
        return res.status(404).json({ error: `Product not found with ID: ${id}` });
      }
      return res.status(200).json(updatedProduct);
    }

    const index = inMemoryProducts.findIndex((p) => p.id === String(id));
    if (index === -1) {
      return res.status(404).json({ error: `Product not found with ID: ${id}` });
    }

    if (name) inMemoryProducts[index].name = name;
    if (price !== undefined) inMemoryProducts[index].price = Number(price);
    if (category) inMemoryProducts[index].category = category;
    if (stock !== undefined) inMemoryProducts[index].stock = Number(stock);

    res.status(200).json(inMemoryProducts[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
});

// DELETE /products/:id - Delete product
app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;

  try {
    if (useMongoDB && ProductModel) {
      const deletedProduct = await ProductModel.findOneAndDelete({ id: String(id) });
      if (!deletedProduct) {
        return res.status(404).json({ error: `Product not found with ID: ${id}` });
      }
      return res.status(200).json({ message: `Product ${id} successfully deleted.` });
    }

    const index = inMemoryProducts.findIndex((p) => p.id === String(id));
    if (index === -1) {
      return res.status(404).json({ error: `Product not found with ID: ${id}` });
    }

    inMemoryProducts.splice(index, 1);
    res.status(200).json({ message: `Product ${id} successfully deleted.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Product Service] Running on port ${PORT}`);
});
