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

// Generar reporte PDF mejorado
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

    // Configuración del documento con márgenes adecuados
    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
      bufferPages: true
    });

    // Configurar headers de respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_ventas_${sellerCode}_${new Date().toISOString().split('T')[0]}.pdf`
    );

    // Manejo de errores
    doc.on('error', (err) => {
      console.error('Error en generación de PDF:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error generando PDF' });
      }
    });

    doc.pipe(res);

    // Estilo para el título principal
    doc.font('Helvetica-Bold')
       .fontSize(20)
       .fillColor('#2c3e50')
       .text('REPORTE DE VENTAS', { align: 'center' })
       .moveDown(0.5);

    // Información del vendedor
    doc.font('Helvetica')
       .fontSize(12)
       .fillColor('#34495e')
       .text(`Vendedor: ${sellerName}`)
       .text(`Código: ${sellerCode}`)
       .moveDown(0.5);

    // Período del reporte
    if (startDate || endDate) {
      doc.text(
        `Período: ${startDate ? new Date(startDate).toLocaleDateString() : 'Inicio'} - ${endDate ? new Date(endDate).toLocaleDateString() : 'Actual'}`
      );
    }

    // Línea divisoria decorativa
    doc.moveTo(40, doc.y + 10)
       .lineTo(550, doc.y + 10)
       .lineWidth(1)
       .stroke('#e0e0e0')
       .moveDown(1.5);

    if (sales.length === 0) {
      doc.fontSize(14)
         .fillColor('#7f8c8d')
         .text('No se encontraron ventas para el período seleccionado', { align: 'center' });
      doc.end();
      return;
    }

    // Configuración de la tabla mejorada
    const table = {
      headers: ['Fecha', 'Cliente', 'Productos', 'Cant.', 'Total', 'Método Pago'],
      widths: [70, 90, 140, 40, 80, 100],
      align: ['left', 'left', 'left', 'center', 'right', 'left'],
      x: 40,
      y: doc.y
    };

    // Encabezados de tabla con estilo mejorado
    doc.rect(table.x, table.y, 550, 25)
       .fill('#3498db');

    doc.font('Helvetica-Bold')
       .fontSize(11)
       .fillColor('#ffffff')
       .text(table.headers[0], table.x + 5, table.y + 7, { width: table.widths[0] })
       .text(table.headers[1], table.x + table.widths[0] + 15, table.y + 7, { width: table.widths[1] })
       .text(table.headers[2], table.x + table.widths[0] + table.widths[1] + 25, table.y + 7, { width: table.widths[2] })
       .text(table.headers[3], table.x + table.widths[0] + table.widths[1] + table.widths[2] + 35, table.y + 7, { width: table.widths[3], align: 'center' })
       .text(table.headers[4], table.x + table.widths[0] + table.widths[1] + table.widths[2] + table.widths[3] + 45, table.y + 7, { width: table.widths[4], align: 'right' })
       .text(table.headers[5], table.x + table.widths[0] + table.widths[1] + table.widths[2] + table.widths[3] + table.widths[4] + 55, table.y + 7, { width: table.widths[5] });

    let y = table.y + 30;
    let totalCantidad = 0;
    let totalVentas = 0;

    // Filas de datos con estilo alternado
    sales.forEach((sale, index) => {
      // Nueva página si es necesario
      if (y > 700) {
        doc.addPage();
        y = 40;
        
        // Repetir encabezados en nueva página
        doc.font('Helvetica-Bold')
           .fontSize(20)
           .fillColor('#2c3e50')
           .text('REPORTE DE VENTAS (Continuación)', { align: 'center' })
           .moveDown(0.5);
        
        doc.moveTo(40, doc.y + 10)
           .lineTo(550, doc.y + 10)
           .lineWidth(1)
           .stroke('#e0e0e0')
           .moveDown(1.5);
        
        doc.rect(40, doc.y, 550, 25)
           .fill('#3498db');
        
        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fillColor('#ffffff')
           .text(table.headers[0], 45, doc.y + 7, { width: table.widths[0] })
           .text(table.headers[1], 45 + table.widths[0] + 15, doc.y + 7, { width: table.widths[1] })
           .text(table.headers[2], 45 + table.widths[0] + table.widths[1] + 25, doc.y + 7, { width: table.widths[2] })
           .text(table.headers[3], 45 + table.widths[0] + table.widths[1] + table.widths[2] + 35, doc.y + 7, { width: table.widths[3], align: 'center' })
           .text(table.headers[4], 45 + table.widths[0] + table.widths[1] + table.widths[2] + table.widths[3] + 45, doc.y + 7, { width: table.widths[4], align: 'right' })
           .text(table.headers[5], 45 + table.widths[0] + table.widths[1] + table.widths[2] + table.widths[3] + table.widths[4] + 55, doc.y + 7, { width: table.widths[5] });
        
        y = doc.y + 30;
      }

      const productNames = sale.items.map(item => item.name).join(', ');
      const cantidadTotal = sale.items.reduce((sum, item) => sum + item.quantity, 0);
      totalCantidad += cantidadTotal;
      totalVentas += sale.total;

      // Fondo alternado para filas
      doc.rect(40, y - 5, 550, 20)
         .fill(index % 2 === 0 ? '#f8f9fa' : '#ffffff');

      // Contenido de la fila
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#2c3e50')
         .text(new Date(sale.saleDate).toLocaleDateString(), 45, y, { width: table.widths[0] })
         .text(sale.customerName || 'N/A', 45 + table.widths[0] + 15, y, { width: table.widths[1] })
         .text(productNames, 45 + table.widths[0] + table.widths[1] + 25, y, { width: table.widths[2] })
         .text(cantidadTotal.toString(), 45 + table.widths[0] + table.widths[1] + table.widths[2] + 35, y, { width: table.widths[3], align: 'center' })
         .text(formatCurrency(sale.total), 45 + table.widths[0] + table.widths[1] + table.widths[2] + table.widths[3] + 45, y, { width: table.widths[4], align: 'right' })
         .text(sale.paymentMethod || 'N/A', 45 + table.widths[0] + table.widths[1] + table.widths[2] + table.widths[3] + table.widths[4] + 55, y, { width: table.widths[5] });

      y += 20;
    });

    // Línea divisoria antes de los totales
    doc.moveTo(40, y + 10)
       .lineTo(550, y + 10)
       .lineWidth(1)
       .stroke('#e0e0e0')
       .moveDown(1);

    // MEJORA: Sección de resumen mejor organizada
    const summaryY = y + 20;
    
    // Título de resumen
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor('#2c3e50')
       .text('RESUMEN FINAL', 400, summaryY, { align: 'right', width: 150, lineBreak: false });
    
    // Total Ventas - en una sola línea
    doc.font('Helvetica-Bold')
       .fontSize(11)
       .fillColor('#2c3e50')
       .text('Total Ventas: ', 400, summaryY + 20, { width: 100, align: 'right', lineBreak: false })
       .font('Helvetica')
       .fillColor('#e74c3c')
       .text(formatCurrency(totalVentas), 505, summaryY + 20, { width: 80, align: 'right', lineBreak: false });
    
    // Ventas realizadas - en una sola línea
    doc.font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Ventas realizadas: ', 400, summaryY + 40, { width: 100, align: 'right', lineBreak: false })
       .font('Helvetica')
       .fillColor('#e74c3c')
       .text(sales.length.toString(), 505, summaryY + 40, { width: 80, align: 'right', lineBreak: false });
    
    // Productos vendidos - en una sola línea
    doc.font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('Productos vendidos: ', 400, summaryY + 60, { width: 100, align: 'right', lineBreak: false })
       .font('Helvetica')
       .fillColor('#e74c3c')
       .text(totalCantidad.toString(), 505, summaryY + 60, { width: 80, align: 'right', lineBreak: false });

    // MEJORA: Pie de página en una sola línea
    const footerText = `Reporte generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    
    doc.moveDown(2)
       .font('Helvetica-Oblique')
       .fontSize(10)
       .fillColor('#95a5a6')
       .text(footerText, { align: 'center', width: 400, lineBreak: false });

    doc.end();

  } catch (error) {
    console.error('Error generando reporte:', error);
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
      // Crear fecha con hora fija a mediodía UTC para evitar desfase
      adjustedSaleDate = new Date(saleDate + 'T12:00:00Z');
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