const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const verifyToken = require('../middleware/authMiddleware');

// Obtener todos los pedidos (solo admin)
router.get('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// (Opcional) Crear pedido (para pruebas)
router.post('/', async (req, res) => {
  try {
    const { customerName, customerEmail, address, items, total, sellerCode } = req.body;
    let seller = null;
    if (sellerCode) {
      seller = await require('../models/Seller').findOne({ code: sellerCode });
      if (!seller) return res.status(400).json({ error: 'Código de vendedor inválido' });
    }
    const order = new Order({ customerName, customerEmail, address, items, total, seller: seller?._id, sellerCode: sellerCode || null });
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear pedido' });
  }
});

module.exports = router;
