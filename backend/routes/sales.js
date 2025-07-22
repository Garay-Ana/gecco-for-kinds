// ventas.routes.js - versión unificada y optimizada

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Seller = require('../models/Seller');
const Product = require('../models/Product');
const verifyToken = require('../middleware/authMiddleware');
const PDFDocument = require('pdfkit');

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value);
}

// Obtener ventas con filtros
router.get('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }

    const { startDate, endDate, customerName, paymentMethod } = req.query;
    const filter = { seller: req.user.id };

    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) filter.saleDate.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    if (customerName) {
      filter.customerName = { $regex: customerName, $options: 'i' };
    }
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    const sales = await Order.find(filter)
      .sort({ saleDate: -1 })
      .populate('items.product');

    const totalVentas = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalProductos = sales.reduce((sum, sale) => {
      if (sale.items && Array.isArray(sale.items)) {
        return sum + sale.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
      }
      return sum;
    }, 0);

    res.json({
      success: true,
      data: sales,
      summary: {
        totalVentas,
        cantidadVentas: sales.length,
        totalProductos
      }
    });

  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ success: false, error: 'Error interno al obtener ventas' });
  }
});

// Generar PDF
router.get('/report', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { startDate, endDate } = req.query;
    const filter = { seller: req.user.id };

    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) filter.saleDate.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const sales = await Order.find(filter)
      .sort({ saleDate: -1 })
      .populate('items.product');

    const seller = await Seller.findById(req.user.id);
    const sellerName = seller?.name || 'No especificado';
    const sellerCode = seller?.code || 'No especificado';

    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_ventas_${sellerCode}_${new Date().toISOString().split('T')[0]}.pdf`);

    doc.on('error', err => {
      console.error('Error en generación de PDF:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Error generando PDF' });
    });

    doc.pipe(res);

    doc.font('Helvetica-Bold').fontSize(20).fillColor('#2c3e50').text('REPORTE DE VENTAS', { align: 'center' }).moveDown(0.5);
    doc.font('Helvetica').fontSize(12).fillColor('#34495e')
      .text(`Vendedor: ${sellerName}`)
      .text(`Código: ${sellerCode}`).moveDown(0.5);

    if (startDate || endDate) {
      doc.text(`Período: ${startDate ? new Date(startDate).toLocaleDateString('es-CO') : 'Inicio'} - ${endDate ? new Date(endDate).toLocaleDateString('es-CO') : 'Actual'}`);
    }

    doc.moveTo(40, doc.y + 10).lineTo(550, doc.y + 10).lineWidth(1).stroke('#e0e0e0').moveDown(1.5);

    if (!sales.length) {
      doc.fontSize(14).fillColor('#7f8c8d').text('No se encontraron ventas para el período seleccionado', { align: 'center' });
      doc.end();
      return;
    }

    const headers = ['Fecha', 'Cliente', 'Producto', 'Cant.', 'Unitario', 'Subtotal', 'Pago'];
    const widths = [60, 80, 110, 40, 60, 70, 100];
    let y = doc.y + 30;
    let totalCantidad = 0;
    let totalVentas = 0;

    const drawHeader = () => {
      doc.rect(40, y, 550, 25).fill('#3498db');
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff');
      let x = 45;
      headers.forEach((h, i) => {
        doc.text(h, x, y + 7, { width: widths[i], align: i === 3 ? 'center' : (i >= 4 && i <= 5 ? 'right' : 'left') });
        x += widths[i];
      });
      y += 30;
    };

    drawHeader();

    sales.forEach((sale, idx) => {
      sale.items.forEach((item, i) => {
        const subtotal = item.quantity * item.price;
        totalCantidad += item.quantity;
        totalVentas += subtotal;

        const fechaVenta = sale.saleDate
          ? new Date(sale.saleDate).toLocaleDateString('es-CO')
          : new Date(sale.createdAt).toLocaleDateString('es-CO');

        if (y > 700) {
          doc.addPage();
          y = 40;
          drawHeader();
        }

        doc.rect(40, y - 5, 550, 20).fill((idx + i) % 2 === 0 ? '#f8f9fa' : '#ffffff');
        doc.font('Helvetica').fontSize(10).fillColor('#2c3e50');

        let x = 45;
        const row = [
          fechaVenta,
          sale.customerName || 'N/A',
          item.name,
          item.quantity.toString(),
          formatCurrency(item.price),
          formatCurrency(subtotal),
          sale.paymentMethod || 'N/A'
        ];
        row.forEach((text, j) => {
          doc.text(text, x, y, { width: widths[j], align: j === 3 ? 'center' : (j >= 4 && j <= 5 ? 'right' : 'left') });
          x += widths[j];
        });

        y += 20;
      });
    });

    doc.moveDown(2);
    if (y > 650) {
      doc.addPage();
      y = 40;
    }

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50')
      .text('RESUMEN FINAL', 400, y + 10, { align: 'right' });

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#2c3e50')
      .text('Total recaudado: ', 400, y + 35, { width: 120, align: 'right' })
      .font('Helvetica').fillColor('#e74c3c')
      .text(formatCurrency(totalVentas), 525, y + 35, { width: 60, align: 'right' });

    doc.font('Helvetica-Bold').fillColor('#2c3e50')
      .text('Número de ventas: ', 400, y + 55, { width: 120, align: 'right' })
      .font('Helvetica').fillColor('#e74c3c')
      .text(sales.length.toString(), 525, y + 55, { width: 60, align: 'right' });

    doc.font('Helvetica-Bold').fillColor('#2c3e50')
      .text('Productos vendidos: ', 400, y + 75, { width: 120, align: 'right' })
      .font('Helvetica').fillColor('#e74c3c')
      .text(totalCantidad.toString(), 525, y + 75, { width: 60, align: 'right' });

    const footerText = `Reporte generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO', {
      hour: '2-digit', minute: '2-digit'
    })}`;

    doc.moveDown(2).font('Helvetica-Oblique').fontSize(10).fillColor('#95a5a6')
      .text(footerText, { align: 'center', width: 400 });

    doc.end();

  } catch (error) {
    console.error('Error generando PDF:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Error generando el reporte' });
  }
});

// Registrar nueva venta
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      saleDate,
      customerName,
      customerPhone,
      products,
      quantity,
      totalPrice,
      hasSeller,
      sellerCode,
      paymentMethod,
      notes,
      address
    } = req.body;

    if (!customerName || !products || !quantity || !totalPrice) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const productNames = products.split(',').map(p => p.trim());
    const items = [];

    for (const name of productNames) {
      const productDoc = await Product.findOne({ name: new RegExp('^' + name + '$', 'i') });
      if (!productDoc) {
        return res.status(400).json({ success: false, error: `Producto no encontrado: ${name}` });
      }
      items.push({
        product: productDoc._id,
        name: productDoc.name,
        quantity: Number(quantity),
        price: productDoc.price || 0
      });
    }

    const adjustedSaleDate = saleDate
      ? (typeof saleDate === 'string' && !saleDate.includes('T')
          ? new Date(saleDate + 'T12:00:00Z')
          : new Date(saleDate))
      : null;

    const newOrder = new Order({
      customerName,
      customerPhone,
      address: address || 'No especificada',
      items,
      total: Number(totalPrice),
      paymentMethod,
      notes,
      saleDate: adjustedSaleDate,
      seller: req.user.id,
      sellerCode: hasSeller === 'Sí' ? sellerCode : null
    });

    await newOrder.save();
    res.status(201).json({ success: true, message: 'Venta registrada correctamente' });

  } catch (error) {
    console.error('Error al registrar la venta:', error);
    res.status(500).json({ error: 'Error al registrar la venta' });
  }
});

module.exports = router;
