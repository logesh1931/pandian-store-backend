const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// GET /api/cart
router.get('/', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart) return res.json({ items: [], total: 0 });

    const total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    res.json({ items: cart.items, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/cart/add
router.post('/add', protect, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await Product.findById(productId);
    if (!product || !product.isActive) return res.status(404).json({ message: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ message: 'Insufficient stock' });

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, items: [] });

    const existingIdx = cart.items.findIndex(i => i.product.toString() === productId);
    if (existingIdx >= 0) {
      cart.items[existingIdx].quantity = Math.min(cart.items[existingIdx].quantity + quantity, product.stock);
    } else {
      cart.items.push({ product: productId, quantity, price: product.price });
    }

    await cart.save();
    const populated = await Cart.findById(cart._id).populate('items.product');
    const total = populated.items.reduce((s, i) => s + i.price * i.quantity, 0);
    res.json({ items: populated.items, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/cart/update
router.put('/update', protect, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.find(i => i.product.toString() === productId);
    if (!item) return res.status(404).json({ message: 'Item not in cart' });

    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i.product.toString() !== productId);
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    const populated = await Cart.findById(cart._id).populate('items.product');
    const total = populated.items.reduce((s, i) => s + i.price * i.quantity, 0);
    res.json({ items: populated.items, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/cart/remove/:productId
router.delete('/remove/:productId', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = cart.items.filter(i => i.product.toString() !== req.params.productId);
    await cart.save();
    res.json({ message: 'Item removed', items: cart.items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/cart/clear
router.delete('/clear', protect, async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user._id });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
