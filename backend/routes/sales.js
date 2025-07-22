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
  headers: ['Fecha', 'Vendedor', 'Producto', 'Cant.', 'Unitario', 'Subtotal', 'Método Pago'],
  widths: [60, 80, 110, 40, 60, 70, 100], // total: ~520
  align: ['left', 'left', 'left', 'center', 'right', 'right', 'left'],
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

let y = doc.y + 30;
let totalCantidad = 0;
let totalVentas = 0;

sales.forEach((sale, index) => {
  sale.items.forEach((item, idx) => {
    const subtotal = item.quantity * item.price;
    totalCantidad += item.quantity;
    totalVentas += subtotal;

    const fechaVenta = sale.saleDate
      ? new Date(sale.saleDate).toLocaleDateString('es-CO')
      : new Date(sale.createdAt).toLocaleDateString('es-CO');

    if (y > 700) {
      doc.addPage();
      y = 40;

      // Repetir encabezado
      doc.rect(table.x, y, 550, 25).fill('#3498db');
      doc.font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#ffffff')
        .text(table.headers[0], table.x + 5, y + 7, { width: table.widths[0] })
        .text(table.headers[1], table.x + table.widths[0] + 15, y + 7, { width: table.widths[1] })
        .text(table.headers[2], table.x + table.widths[0] + table.widths[1] + 25, y + 7, { width: table.widths[2] })
        .text(table.headers[3], table.x + table.widths[0] + table.widths[1] + table.widths[2] + 35, y + 7, { width: table.widths[3], align: 'center' })
        .text(table.headers[4], table.x + table.widths[0] + table.widths[1] + table.widths[2] + table.widths[3] + 45, y + 7, { width: table.widths[4], align: 'right' })
        .text(table.headers[5], table.x + table.widths[0] + table.widths[1] + table.widths[2] + table.widths[3] + table.widths[4] + 55, y + 7, { width: table.widths[5] });

      y += 30;
    }

    // Fila alternada
    doc.rect(40, y - 5, 550, 20)
       .fill((index + idx) % 2 === 0 ? '#f8f9fa' : '#ffffff');

    doc.font('Helvetica')
      .fontSize(10)
      .fillColor('#2c3e50')
      .text(fechaVenta, 45, y, { width: table.widths[0] })
      .text(sale.customerName || 'N/A', 45 + table.widths[0] + 15, y, { width: table.widths[1] })
      .text(item.name, 45 + table.widths[0] + table.widths[1] + 25, y, { width: table.widths[2] })
      .text(item.quantity.toString(), 45 + table.widths[0] + table.widths[1] + table.widths[2] + 35, y, { width: table.widths[3], align: 'center' })
      .text(formatCurrency(item.price), 45 + table.widths[0] + table.widths[1] + table.widths[2] + table.widths[3] + 45, y, { width: table.widths[4], align: 'right' })
      .text(formatCurrency(subtotal), 45 + table.widths[0] + table.widths[1] + table.widths[2] + table.widths[3] + table.widths[4] + 55, y, { width: table.widths[5], align: 'right' })
      .text(sale.paymentMethod || 'N/A', 45 + table.widths[0] + table.widths[1] + table.widths[2] + table.widths[3] + table.widths[4] + table.widths[5] + 65, y, { width: table.widths[6] });

    y += 20;
  });
});

// ⬇️⬇️ SECCIÓN DE RESUMEN
if (y > 650) {
  doc.addPage();
  y = 40;
}

doc.moveDown(2);

doc.font('Helvetica-Bold')
  .fontSize(12)
  .fillColor('#2c3e50')
  .text('RESUMEN FINAL', 400, y + 10, { align: 'right', width: 150 });

doc.font('Helvetica-Bold')
  .fontSize(11)
  .fillColor('#2c3e50')
  .text('Total dinero recaudado: ', 400, y + 35, { width: 120, align: 'right' })
  .font('Helvetica')
  .fillColor('#e74c3c')
  .text(formatCurrency(totalVentas), 525, y + 35, { width: 60, align: 'right' });

doc.font('Helvetica-Bold')
  .fillColor('#2c3e50')
  .text('Número de ventas realizadas: ', 400, y + 55, { width: 120, align: 'right' })
  .font('Helvetica')
  .fillColor('#e74c3c')
  .text(sales.length.toString(), 525, y + 55, { width: 60, align: 'right' });

doc.font('Helvetica-Bold')
  .fillColor('#2c3e50')
  .text('Cantidad total de productos vendidos: ', 400, y + 75, { width: 120, align: 'right' })
  .font('Helvetica')
  .fillColor('#e74c3c')
  .text(totalCantidad.toString(), 525, y + 75, { width: 60, align: 'right' });

// Pie de página
const footerText = `Reporte generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO', {
  hour: '2-digit',
  minute: '2-digit'
})}`;

doc.moveDown(2)
  .font('Helvetica-Oblique')
  .fontSize(10)
  .fillColor('#95a5a6')
  .text(footerText, { align: 'center', width: 400 });

// Finalizar PDF
doc.end();



  } catch (error) {
    console.error('Error generando reporte:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error generando el reporte' });
    }
  }
});

// 

router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      saleDate,
      sellerName,
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
    
    const parsedDate = saleDate ? new Date(saleDate) : new Date();


    if (!sellerName || !products || !quantity || !totalPrice) {
  return res.status(400).json({ error: 'Faltan campos requeridos' });
}

    const currentSeller = await Seller.findById(req.user.id);
    if (!currentSeller) {
      return res.status(403).json({ error: 'Vendedor autenticado no encontrado' });
    }

    const enteredName = sellerName.trim().toLowerCase();
    const myName = currentSeller.name.trim().toLowerCase();

    let isValidSeller = enteredName === myName;
    const subordinates = await Seller.find({ jefe: currentSeller._id });
    const names = subordinates.map(s => s.name.trim().toLowerCase());

if (!isValidSeller && names.includes(enteredName)) {
  isValidSeller = true;
}


    if (hasSeller === 'Sí' && sellerCode) {
      const secondarySeller = await Seller.findOne({ code: sellerCode.trim() });
      if (!secondarySeller) {
        return res.status(400).json({ error: 'Código de vendedor no válido' });
      }
    }

    if (!isValidSeller) {
  console.log('Vendedor ingresado no válido:', sellerName); // ⚠️ si en tu formulario usas 'customerName'
  console.log('Subordinados permitidos:', names); // 'names' es el array de nombres de subordinados
  return res.status(403).json({ error: 'Nombre de vendedor no autorizado' });
}

    const items = [{
      product: new mongoose.Types.ObjectId(), // temporal (reemplazar si tienes ID reales)
      name: products,
      quantity: Number(quantity),
      price: Number(totalPrice)
    }];
     
    const newOrder = new Order({
      customerName: sellerName,
      address: address || 'No especificada',
      items,
      total: Number(totalPrice),
      paymentMethod,
      notes,
      saleDate: parsedDate,
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