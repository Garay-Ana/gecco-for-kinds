
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Seller = require('../models/Seller');
const verifyToken = require('../middleware/authMiddleware');
const PDFDocument = require('pdfkit');
require('pdfkit-table'); // Confirmar que la librería está importada

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
  console.log('>>> Generando PDF con tabla');

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

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte_ventas_${sellerCode}_${new Date().toISOString().split('T')[0]}.pdf`
    );

    doc.pipe(res);

    // Encabezado
    doc.fontSize(20).font('Helvetica-Bold').text('REPORTE DE VENTAS', { align: 'center' }).moveDown(0.5);
    doc.fontSize(12).font('Helvetica')
      .text(`Vendedor: ${sellerName}`)
      .text(`Código: ${sellerCode}`)
      .moveDown(0.5);

    if (startDate || endDate) {
      doc.text(`Período: ${startDate || 'Inicio'} - ${endDate || 'Actual'}`);
    }

    doc.moveDown(1);

    // Validar si hay ventas
    if (!sales.length) {
      doc.fontSize(14).fillColor('#7f8c8d')
        .text('No se encontraron ventas para el período seleccionado', { align: 'center' });
      doc.end();
      console.log('>>> Sin ventas para mostrar');
      return;
    }

    // Preparar filas
    const rows = [];
    let totalCantidad = 0;
    let totalVentas = 0;

    for (const sale of sales) {
      const productos = sale.items.map(i => i.name).join(', ');
      const cantidad = sale.items.reduce((s, i) => s + i.quantity, 0);
      totalCantidad += cantidad;
      totalVentas += sale.total;

      rows.push([
        new Date(sale.saleDate).toLocaleDateString('es-CO'),
        sale.sellerName || 'N/A', // Cambiado a vendedor
        productos,
        cantidad,
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(sale.total),
        sale.paymentMethod || 'N/A'
      ]);
    }

    console.log('Cantidad de filas para tabla:', rows.length);

    // Tabla de prueba para verificar doc.table
    const testTable = {
      headers: ['Col1', 'Col2', 'Col3'],
      rows: [
        ['Dato 1', 'Dato 2', 'Dato 3'],
        ['Dato 4', 'Dato 5', 'Dato 6']
      ]
    };

    await doc.table(testTable, {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(11),
      prepareRow: () => doc.font('Helvetica').fontSize(10),
      columnSpacing: 10,
      padding: 8,
      width: 520
    });

    // Tabla real
    const table = {
      headers: ['Fecha', 'Vendedor', 'Productos', 'Cantidad', 'Total', 'Método de Pago'], // Cambiado encabezados
      rows
    };

    await doc.table(table, {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(11),
      prepareRow: () => doc.font('Helvetica').fontSize(10),
      columnSpacing: 10,
      padding: 8,
      width: 520
    });

    // Resumen final
    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(12).text('RESUMEN FINAL', { align: 'right' });
    doc.font('Helvetica').fontSize(11)
      .text(`Total ventas: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(totalVentas)}`, { align: 'right' })
      .text(`Ventas realizadas: ${sales.length}`, { align: 'right' })
      .text(`Productos vendidos: ${totalCantidad}`, { align: 'right' });

    // Pie de página
    const now = new Date();
    now.setHours(now.getHours() - 5);
    const fecha = now.toLocaleDateString('es-CO');
    const hora = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

    doc.moveDown(2)
      .fontSize(10)
      .fillColor('#95a5a6')
      .text(`Reporte generado el ${fecha} a las ${hora}`, { align: 'center' });

    doc.end();
    console.log('>>> PDF generado con tabla correctamente ✅');

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