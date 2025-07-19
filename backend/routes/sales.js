const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Seller = require('../models/Seller');
const verifyToken = require('../middleware/authMiddleware');
const PDFDocument = require('pdfkit');

// Listar ventas con filtros para vendedor autenticado
router.get('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const { startDate, endDate, customerName, paymentMethod } = req.query;
    const filter = { seller: req.user.id };

    if (startDate || endDate) {
      // Convertir strings a fechas para consulta
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate + 'T00:00:00Z');
      if (endDate) filter.saleDate.$lte = new Date(endDate + 'T23:59:59Z');
    }
    if (customerName) {
      filter.customerName = { $regex: customerName, $options: 'i' };
    }
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    const sales = await Order.find(filter).sort({ saleDate: -1 });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// Crear venta
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const {
      saleDate,
      customerName,
      customerPhone,
      products,
      quantity,
      totalPrice,
      hasSeller,
      sellerCode,
      sellerName,
      paymentMethod,
      notes
    } = req.body;

    if (!customerName || !products || !quantity || !totalPrice) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const productNames = products.split(',').map(p => p.trim()).filter(p => p.length > 0);
    const items = [];

    for (let name of productNames) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const product = await Product.findOne({ name: { $regex: escapedName, $options: 'i' } });
      if (!product) {
        return res.status(400).json({ error: `Producto no encontrado: ${name}` });
      }
      items.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: Number(quantity) || 1
      });
    }

    const order = new Order({
      createdAt: new Date(),
      saleDate: saleDate ? (() => {
        const d = new Date(saleDate);
        d.setUTCHours(12, 0, 0, 0);
        return d;
      })() : new Date(),
      customerName,
      customerEmail: '',
      address: 'No especificada',
      items,
      total: totalPrice || 0,
      seller: req.user.id,
      sellerCode: hasSeller === 'Sí' ? sellerCode : req.user.code,
      sellerName: hasSeller === 'Sí' ? sellerName : '',
      sellerPhone: hasSeller === 'Sí' ? customerPhone : '',
      paymentMethod,
      notes
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    console.error('Error al crear venta:', error);
    res.status(500).json({ error: error.message || 'Error al crear venta' });
  }
});

// Reporte PDF
router.get('/report', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { startDate, endDate } = req.query;
    const filter = { seller: req.user.id };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const sales = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('items.product');

    const seller = await Seller.findById(req.user.id);
    const sellerName = seller?.name || 'No especificado';
    const sellerCode = seller?.code || 'No especificado';

    const doc = new PDFDocument({ margin: 30 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_ventas_${new Date().toISOString().split('T')[0]}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(20).text('Reporte de Ventas', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12)
      .text(`Vendedor: ${sellerName}`, { align: 'left' })
      .text(`Código: ${sellerCode}`, { align: 'left' })
      .moveDown();

    if (startDate || endDate) {
      doc.text(
        `Período: ${startDate ? new Date(startDate).toLocaleDateString() : 'Inicio'} - ${endDate ? new Date(endDate).toLocaleDateString() : 'Actual'}`,
        { align: 'left' }
      );
      doc.moveDown();
    }

    let y = 150;

    doc.font('Helvetica-Bold')
      .fontSize(10)
      .text('Fecha', 50, y)
      .text('Vendedor', 100, y)
      .text('Productos', 180, y, { width: 120 })
      .text('Cantidad', 310, y, { width: 60 })
      .text('Total', 380, y, { width: 80, align: 'right' })
      .text('Pago', 470, y);

    y += 20;
    doc.moveTo(50, y).lineTo(550, y).stroke();

    let totalCantidad = 0;

    sales.forEach((sale) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      const productNames = sale.items.map(item => item.name).join(', ');
      const quantities = sale.items.map(item => item.quantity).join(', ');
      const cantidadTotalPorVenta = sale.items.reduce((sum, item) => sum + item.quantity, 0);
      totalCantidad += cantidadTotalPorVenta;

      doc.font('Helvetica')
        .fontSize(10)
        .text(new Date(sale.createdAt).toLocaleDateString(), 50, y)
        .text(sale.customerName || 'N/A', 100, y, { width: 80 })
        .text(productNames, 180, y, { width: 120 })
        .text(quantities, 310, y, { width: 60 })
        .text(formatCurrency(sale.total), 380, y, { width: 80, align: 'right' })
        .text(sale.paymentMethod || 'N/A', 470, y);

      y += 25;
    });

    const totalVentas = sales.reduce((sum, sale) => sum + sale.total, 0);
    doc.font('Helvetica-Bold')
      .fontSize(12)
      .text(`Total Ventas: ${formatCurrency(totalVentas)}`, 380, y + 20, { width: 150, align: 'right' })
      .text(`Cantidad de Ventas: ${sales.length}`, 380, y + 40, { width: 150, align: 'right' })
      .text(`Total de Productos Vendidos: ${totalCantidad}`, 380, y + 60, { width: 150, align: 'right' });

    doc.fontSize(10)
      .text(`Generado el: ${new Date().toLocaleDateString()}`, 50, 750, { align: 'left' });

    doc.end();

  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ error: 'Error generando el reporte' });
  }
});

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value);
}

module.exports = router;
