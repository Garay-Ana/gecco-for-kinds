
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Seller = require('../models/Seller');
const verifyToken = require('../middleware/authMiddleware');
const PDFDocument = require('pdfkit');

// Función para formatear moneda
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
      return res.status(403).json({ 
        success: false, 
        error: 'No autorizado' 
      });
    }

    const { startDate, endDate, customerName, paymentMethod } = req.query;
    const filter = { seller: req.user.id };

    // Validación de fechas
    if (startDate && isNaN(new Date(startDate))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Formato de fecha de inicio inválido (Use DD/MM/AAAA)' 
      });
    }
    if (endDate && isNaN(new Date(endDate))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Formato de fecha de fin inválido (Use DD/MM/AAAA)' 
      });
    }

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

    // Calcular totales de manera segura
    const totalVentas = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalProductos = sales.reduce((sum, sale) => {
      if (sale.items && Array.isArray(sale.items)) {
        return sum + sale.items.reduce((itemSum, item) => 
          itemSum + (item.quantity || 0), 0);
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
    res.status(500).json({ 
      success: false,
      error: 'Error interno al obtener ventas',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Endpoint para generar PDF profesional de reporte de ventas
router.get('/report', verifyToken, async (req, res) => {
  console.log('>>> Generando PDF profesional...');

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

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
      bufferPages: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_ventas_${sellerCode}_${new Date().toISOString().split('T')[0]}.pdf`
    );

    doc.on('error', (err) => {
      console.error('Error en generación de PDF:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error generando PDF' });
      }
    });

    doc.pipe(res);

    // TÍTULO
    doc.font('Helvetica-Bold')
       .fontSize(20)
       .fillColor('#2c3e50')
       .text('REPORTE DE VENTAS PROFESIONAL', { align: 'center' })
       .moveDown(0.5);

    // INFO VENDEDOR
    doc.font('Helvetica')
       .fontSize(12)
       .fillColor('#34495e')
       .text(`Vendedor: ${sellerName}`)
       .text(`Código: ${sellerCode}`)
       .moveDown(0.5);

    // PERIODO
    if (startDate || endDate) {
      doc.text(`Período: ${startDate || 'Inicio'} - ${endDate || 'Actual'}`);
    }

    doc.moveTo(40, doc.y + 10)
       .lineTo(550, doc.y + 10)
       .stroke('#e0e0e0')
       .moveDown(1.5);

    if (sales.length === 0) {
      doc.fontSize(14)
         .fillColor('#7f8c8d')
         .text('No se encontraron ventas para el período seleccionado', { align: 'center' });
      doc.end();
      console.log('>>> PDF generado sin ventas');
      return;
    }

    const formatCurrency = (value) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(value);
    };

    // CONFIG TABLA
    const headers = ['Fecha', 'Vendedor', 'Productos', 'Cant.', 'Total', 'Pago'];
    const widths = [70, 150, 100, 40, 80, 100];
    const startX = 40;
    let y = doc.y;

    // ENCABEZADO TABLA
    doc.rect(startX, y, 550, 25).fill('#3498db');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11);
    let x = startX;
    headers.forEach((header, i) => {
      doc.text(header, x + 5, y + 7, { width: widths[i], align: i === 3 ? 'center' : i === 4 ? 'right' : 'left' });
      x += widths[i];
    });

    y += 30;
    let totalCantidad = 0;
    let totalVentas = 0;

    sales.forEach((sale, index) => {
      if (y > 700) {
        doc.addPage();
        y = 60;
      }

      const productNames = sale.items.map(item => item.name).join(', ');
      const cantidadTotal = sale.items.reduce((sum, item) => sum + item.quantity, 0);
      totalCantidad += cantidadTotal;
      totalVentas += sale.total;

      doc.rect(startX, y - 5, 550, 20)
         .fill(index % 2 === 0 ? '#f8f9fa' : '#ffffff');

      doc.fillColor('#2c3e50').font('Helvetica').fontSize(10);

      const columns = [
        new Date(sale.saleDate).toLocaleDateString('es-CO'),
        sale.customerName || 'N/A',
        productNames,
        cantidadTotal.toString(),
        formatCurrency(sale.total),
        sale.paymentMethod || 'N/A'
      ];

      x = startX;
      columns.forEach((text, i) => {
        doc.text(text, x + 5, y, { width: widths[i], align: i === 3 ? 'center' : i === 4 ? 'right' : 'left' });
        x += widths[i];
      });

      y += 20;
    });

    doc.moveTo(startX, y + 10)
       .lineTo(550, y + 10)
       .stroke('#e0e0e0');

    // RESUMEN
    const summaryY = y + 20;

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50')
       .text('RESUMEN FINAL', 400, summaryY, { align: 'right' });

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#2c3e50')
       .text('Total Ventas: ', 400, summaryY + 20, { align: 'right' })
       .font('Helvetica').fillColor('#e74c3c')
       .text(formatCurrency(totalVentas), 505, summaryY + 20, { align: 'right' });

    doc.font('Helvetica-Bold').fillColor('#2c3e50')
       .text('Ventas realizadas: ', 400, summaryY + 40, { align: 'right' })
       .font('Helvetica').fillColor('#e74c3c')
       .text(sales.length.toString(), 505, summaryY + 40, { align: 'right' });

    doc.font('Helvetica-Bold').fillColor('#2c3e50')
       .text('Productos vendidos: ', 400, summaryY + 60, { align: 'right' })
       .font('Helvetica').fillColor('#e74c3c')
       .text(totalCantidad.toString(), 505, summaryY + 60, { align: 'right' });

    // FOOTER
    const now = new Date();
    now.setHours(now.getHours() - 5);
    const date = now.toLocaleDateString('es-CO');
    const time = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

    doc.moveDown(2).font('Helvetica-Oblique').fontSize(10)
       .fillColor('#95a5a6')
       .text(`Reporte generado el ${date} a las ${time}`, { align: 'center' });

    doc.end();
    console.log('>>> PDF generado correctamente ✅');

  } catch (error) {
    console.error('>>> ERROR generando reporte:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error generando el reporte' });
    }
  }
});


const Product = require('../models/Product');

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

    // Crear items con product ObjectId
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

    // Ajustar saleDate para evitar desfase de zona horaria
    let adjustedSaleDate = null;
    if (saleDate) {
      // Si saleDate es string en formato ISO o fecha, crear objeto Date directamente
      if (typeof saleDate === 'string' && !saleDate.includes('T')) {
        // Si no tiene hora, agregar mediodía UTC para evitar desfase
        adjustedSaleDate = new Date(saleDate + 'T12:00:00Z');
      } else {
        adjustedSaleDate = new Date(saleDate);
      }
    }

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