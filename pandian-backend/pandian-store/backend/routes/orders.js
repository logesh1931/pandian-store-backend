const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// POST /api/orders - Place order
router.post('/', protect, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, fulfillmentType, notes } = req.body;

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: 'Cart is empty' });

    // Validate stock
    for (const item of cart.items) {
      if (!item.product || item.product.stock < item.quantity)
        return res.status(400).json({ message: `Insufficient stock for ${item.product?.name}` });
    }

    const itemsTotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveryCharge = fulfillmentType === 'delivery' && itemsTotal < 500 ? 50 : 0;
    const totalAmount = itemsTotal + deliveryCharge;

    const orderItems = cart.items.map(i => ({
      product: i.product._id,
      name: i.product.name,
      image: i.product.images?.[0]?.url || '',
      quantity: i.quantity,
      price: i.price
    }));

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      fulfillmentType,
      itemsTotal,
      deliveryCharge,
      totalAmount,
      notes,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      statusHistory: [{ status: 'placed', note: 'Order placed successfully' }]
    });

    // Update stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, { $inc: { stock: -item.quantity } });
    }

    // Clear cart
    await Cart.findOneAndDelete({ user: req.user._id });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/orders/my - User's orders
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/orders/:id/cancel
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!['placed', 'confirmed'].includes(order.orderStatus))
      return res.status(400).json({ message: 'Cannot cancel this order' });

    order.orderStatus = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', note: 'Cancelled by customer' });

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
