const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, adminProtect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');

// GET /api/products - list with search, category, pagination
router.get('/', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 12, sort = 'createdAt' } = req.query;
    const filter = { isActive: true };

    if (search) filter.$text = { $search: search };
    if (category && category !== 'All') filter.category = category;

    const sortMap = {
      'price_asc': { price: 1 },
      'price_desc': { price: -1 },
      'newest': { createdAt: -1 },
      'rating': { ratings: -1 }
    };

    const products = await Product.find(filter)
      .sort(sortMap[sort] || { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      total,
      pages: Math.ceil(total / limit),
      currentPage: Number(page)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/products/categories
router.get('/categories', async (req, res) => {
  const categories = ['Groceries', 'Clothing', 'Electronics', 'Home & Kitchen', 'Health & Beauty', 'Stationery', 'Toys & Games', 'Sports', 'Footwear', 'Others'];
  res.json(categories);
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/products - Admin only
router.post('/', adminProtect, upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, mrp, category, subcategory, brand, stock, unit, tags } = req.body;

    const images = req.files ? req.files.map(f => ({
      url: `/uploads/${f.filename}`,
      public_id: f.filename
    })) : [];

    const product = await Product.create({
      name, description, price: Number(price), mrp: Number(mrp),
      category, subcategory, brand, stock: Number(stock),
      unit, tags: tags ? tags.split(',').map(t => t.trim()) : [],
      images
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/products/:id - Admin only
router.put('/:id', adminProtect, upload.array('images', 5), async (req, res) => {
  try {
    const { name, description, price, mrp, category, subcategory, brand, stock, unit, tags, isActive } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const newImages = req.files ? req.files.map(f => ({
      url: `/uploads/${f.filename}`,
      public_id: f.filename
    })) : [];

    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price ? Number(price) : product.price;
    product.mrp = mrp ? Number(mrp) : product.mrp;
    product.category = category || product.category;
    product.subcategory = subcategory || product.subcategory;
    product.brand = brand || product.brand;
    product.stock = stock !== undefined ? Number(stock) : product.stock;
    product.unit = unit || product.unit;
    product.tags = tags ? tags.split(',').map(t => t.trim()) : product.tags;
    product.isActive = isActive !== undefined ? isActive === 'true' : product.isActive;
    if (newImages.length > 0) product.images = [...product.images, ...newImages];

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/products/:id - Admin only
router.delete('/:id', adminProtect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.isActive = false;
    await product.save();
    res.json({ message: 'Product removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/products/:id/review
router.post('/:id/review', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user._id.toString());
    if (alreadyReviewed) return res.status(400).json({ message: 'Already reviewed' });

    product.reviews.push({ user: req.user._id, name: req.user.name, rating: Number(rating), comment });
    product.numReviews = product.reviews.length;
    product.ratings = product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length;

    await product.save();
    res.status(201).json({ message: 'Review added' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
