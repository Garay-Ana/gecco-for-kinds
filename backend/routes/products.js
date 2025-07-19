const express = require('express');
const router = express.Router();
const multer = require('multer');
const Product = require('../models/Product');
const verifyToken = require('../middleware/authMiddleware');
const { storage } = require('../config/cloudinary');

const upload = multer({ storage });

// Utilidad para normalizar arrays de string (tallas, colores)
function normalizeStringArray(val) {
  if (Array.isArray(val)) {
    return val.flatMap(v =>
      typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : []
    );
  }
  if (typeof val === 'string') {
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// Crear producto con imagen en Cloudinary
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const { name, price, description, stock, category } = req.body;
    const sizes = normalizeStringArray(req.body.sizes);
    const colors = normalizeStringArray(req.body.colors);
    const image = req.file?.path || '';
    const product = new Product({ name, price, description, stock, image, category, sizes, colors });
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar el producto' });
  }
});

// Crear producto con varias imágenes (galería)
router.post('/multi', verifyToken, upload.array('images', 8), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const { name, price, description, stock, category } = req.body;
    const sizes = normalizeStringArray(req.body.sizes);
    const colors = normalizeStringArray(req.body.colors);
    let images = req.files?.map(f => f.path) || [];
    images = images.filter(img => typeof img === 'string' && img.trim() !== '');
    const image = images[0] || '';
    const product = new Product({ name, price, description, stock, category, image, images, sizes, colors });
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar el producto (multi-imagen)' });
  }
});

// Obtener todos los productos (con filtro por categoría y búsqueda)
router.get('/', async (req, res) => {
  // LOG FORZADO: para ver si llegan peticiones
  console.log('GET /api/products llamada', req.query);
  try {
    const { category, search } = req.query;
    let filter = {};
    if (category && search) {
      filter = {
        $and: [
          { category: { $regex: `^${category.trim()}$`, $options: 'i' } },
          {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } }
            ]
          }
        ]
      };
    } else if (category) {
      filter = { category: { $regex: `^${category.trim()}$`, $options: 'i' } };
    } else if (search) {
      filter = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
    }
    // LOG FILTRO
    console.log('Filtro usado:', JSON.stringify(filter));
    const products = await Product.find(filter);
    res.json(products);
  } catch (error) {
    console.error('❌ Error al obtener productos:', error.message);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Obtener un producto por ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el producto' });
  }
});

// 🗑️ Eliminar producto
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Producto no encontrado' });

    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    console.error('❌ Error al eliminar producto:', error.message);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// ✏️ Editar producto
router.put('/:id', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const { name, price, description, stock, category } = req.body;
    const sizes = normalizeStringArray(req.body.sizes);
    const colors = normalizeStringArray(req.body.colors);
    const updateData = { name, price, description, stock, category, sizes, colors };
    if (req.file?.path) {
      updateData.image = req.file.path;
    }
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// PUT para editar galería
router.put('/multi/:id', verifyToken, upload.array('images', 8), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const { name, price, description, stock, category } = req.body;
    const sizes = normalizeStringArray(req.body.sizes);
    const colors = normalizeStringArray(req.body.colors);
    let images = req.files?.map(f => f.path) || [];
    images = images.filter(img => typeof img === 'string' && img.trim() !== '');
    const updateData = { name, price, description, stock, category, sizes, colors };
    if (images.length > 0) {
      updateData.images = images;
      updateData.image = images[0];
    }
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updatedProduct) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: 'Error al editar el producto (multi-imagen)' });
  }
});

module.exports = router;
