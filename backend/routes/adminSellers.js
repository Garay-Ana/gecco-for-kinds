const express = require('express');
const router = express.Router();
const Seller = require('../models/Seller');
const Client = require('../models/Client');
const Order = require('../models/Order');
const verifyToken = require('../middleware/authMiddleware');

// Middleware para admin
function adminAuth(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'No autorizado' });
}

// Obtener lista completa de vendedores
router.get('/sellers', verifyToken, adminAuth, async (req, res) => {
  try {
    const sellers = await Seller.find().select('-password').lean();
    res.json(sellers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener vendedores' });
  }
});

// Obtener clientes de un vendedor por id
router.get('/sellers/:sellerId/clients', verifyToken, adminAuth, async (req, res) => {
  try {
    const clients = await Client.find({ seller: req.params.sellerId });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// Obtener ventas de un vendedor por id
router.get('/sellers/:sellerId/sales', verifyToken, adminAuth, async (req, res) => {
  try {
    const sales = await Order.find({ seller: req.params.sellerId }).sort({ createdAt: -1 });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// Descargar reporte CSV de ventas de un vendedor
router.get('/sellers/:sellerId/sales/report', verifyToken, adminAuth, async (req, res) => {
  try {
    const sales = await Order.find({ seller: req.params.sellerId }).sort({ createdAt: -1 }).lean();

    // Crear CSV
    const header = 'Fecha,Cliente,Código Vendedor,Productos,Cantidad,Precio Total,Método de Pago,Notas\n';
    const rows = sales.map(sale => {
      const fecha = new Date(sale.createdAt).toLocaleDateString();
      const cliente = sale.customerName || '';
      const codigoVendedor = sale.sellerCode || 'VENTA DIRECTA';
      const productos = sale.items ? sale.items.map(i => i.name).join('; ') : '';
      const cantidad = sale.items ? sale.items.reduce((acc, i) => acc + i.quantity, 0) : 0;
      const precioTotal = sale.total || 0;
      const metodoPago = sale.paymentMethod || '';
      const notas = sale.notes ? sale.notes.replace(/[\n\r]/g, ' ') : '';
      return `"${fecha}","${cliente}","${codigoVendedor}","${productos}","${cantidad}","${precioTotal}","${metodoPago}","${notas}"`;
    }).join('\n');

    const csv = header + rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_ventas_${req.params.sellerId}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

module.exports = router;
