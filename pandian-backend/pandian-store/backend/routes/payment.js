const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Order = require('../models/Order');

// POST /api/payment/create-intent
router.post('/create-intent', protect, async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { amount, orderId } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // paise
      currency: 'inr',
      metadata: { orderId, userId: req.user._id.toString() }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/payment/verify
router.post('/verify', protect, async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { paymentIntentId, orderId } = req.body;

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status === 'succeeded') {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'paid',
        stripePaymentIntentId: paymentIntentId
      });
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: 'Payment not successful' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
