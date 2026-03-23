const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderNumber: { type: String, unique: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    image: String,
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  shippingAddress: {
    name: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  paymentMethod: { type: String, enum: ['cod', 'online'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  stripePaymentIntentId: String,
  itemsTotal: { type: Number, required: true },
  deliveryCharge: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  orderStatus: {
    type: String,
    enum: ['placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'placed'
  },
  fulfillmentType: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
  estimatedDelivery: Date,
  notes: String,
  statusHistory: [{
    status: String,
    updatedAt: { type: Date, default: Date.now },
    note: String
  }]
}, { timestamps: true });

orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    this.orderNumber = 'PS' + Date.now().toString().slice(-8);
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
