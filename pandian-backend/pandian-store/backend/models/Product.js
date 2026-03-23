const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  mrp: { type: Number, required: true, min: 0 },
  category: {
    type: String,
    required: true,
    enum: ['Groceries', 'Clothing', 'Electronics', 'Home & Kitchen', 'Health & Beauty', 'Stationery', 'Toys & Games', 'Sports', 'Footwear', 'Others']
  },
  subcategory: { type: String },
  brand: { type: String },
  images: [{ url: String, public_id: String }],
  stock: { type: Number, required: true, default: 0 },
  unit: { type: String, default: 'piece' },
  tags: [String],
  isActive: { type: Boolean, default: true },
  ratings: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    rating: Number,
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
