const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { adminProtect } = require('../middleware/auth');

const genToken = (id) => jwt.sign({ id, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '1d' });

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    res.json({ token: genToken(admin._id), admin: { _id: admin._id, name: admin.name, email: admin.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/dashboard
router.get('/dashboard', adminProtect, async (req, res) => {
  try {
    const [totalUsers, totalProducts, totalOrders, orders] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.find().select('totalAmount orderStatus createdAt')
    ]);

    const totalRevenue = orders.filter(o => o.orderStatus !== 'cancelled').reduce((s, o) => s + o.totalAmount, 0);
    const pendingOrders = orders.filter(o => ['placed', 'confirmed', 'processing'].includes(o.orderStatus)).length;
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email');

    res.json({ totalUsers, totalProducts, totalOrders, totalRevenue, pendingOrders, recentOrders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/orders
router.get('/orders', adminProtect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { orderStatus: status } : {};
    const orders = await Order.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Order.countDocuments(filter);
    res.json({ orders, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/orders/:id/status
router.put('/orders/:id/status', adminProtect, async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.orderStatus = status;
    order.statusHistory.push({ status, note });
    if (status === 'delivered' && order.paymentMethod === 'cod') order.paymentStatus = 'paid';
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/users
router.get('/users', adminProtect, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
