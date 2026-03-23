const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payment', require('./routes/payment'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', store: 'Pandian Store', location: 'Vadipatti, Tamil Nadu' });
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    // Seed admin on first run
    const Admin = require('./models/Admin');
    const bcrypt = require('bcryptjs');
    const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (!existing) {
      const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await Admin.create({ email: process.env.ADMIN_EMAIL, password: hashed, name: 'Store Admin' });
      console.log('Admin seeded:', process.env.ADMIN_EMAIL);
    }
  })
  .catch(err => console.error('MongoDB error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Pandian Store server running on port ${PORT}`));
