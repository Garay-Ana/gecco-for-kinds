const express = require('express');
const router = express.Router();
const { getProductById } = require('../controllers/productDetailsController');

// GET /api/products/:id
router.get('/:id', getProductById);

module.exports = router;
