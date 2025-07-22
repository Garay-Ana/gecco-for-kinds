const express = require('express');
const router = express.Router();
const Seller = require('../models/Seller');
const Client = require('../models/Client');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');
const Order = require('../models/Order'); // Agregué Order aquí sin duplicar Client

function generateSellerCode(name, zone) {
  const cleanName = name.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const randomNum = Math.floor(10 + Math.random() * 90);
  if (zone) {
    return `${zone.replace(/\s+/g, '').toUpperCase()}-${cleanName.substring(0,6)}${randomNum}`;
  }
  return `${cleanName.substring(0,8)}${randomNum}`;
}

function generateClientCode(name) {
  const cleanName = name.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const randomNum = Math.floor(10 + Math.random() * 90);
  return `${cleanName.substring(0,8)}${randomNum}`;
}

// Registro de vendedor
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, zone } = req.body;
    if (!name || !email || !password || !zone) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    
    const exists = await Seller.findOne({ email });
    if (exists) return res.status(400).json({ error: 'El correo ya está registrado' });
    
    let code;
    let unique = false;
    while (!unique) {
      code = generateSellerCode(name, zone);
      const codeExists = await Seller.findOne({ code });
      if (!codeExists) unique = true;
    }
    
    const seller = new Seller({ name, email, password, zone, code });
    await seller.save();
    res.status(201).json({ message: 'Vendedor registrado', code });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar vendedor', details: err.message });
  }
});

// Login de vendedor
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const seller = await Seller.findOne({ email });
    if (!seller) return res.status(400).json({ error: 'Credenciales incorrectas' });
    
    const match = await seller.comparePassword(password);
    if (!match) return res.status(400).json({ error: 'Credenciales incorrectas' });
    
    const token = jwt.sign(
      { 
        id: seller._id, 
        role: 'seller', 
        zone: seller.zone,
        code: seller.code
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );
    
    res.json({ 
      token,
      user: {
        id: seller._id,
        name: seller.name,
        email: seller.email,
        zone: seller.zone,
        code: seller.code
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión', details: err.message });
  }
});

// Middleware para vendedores
function sellerAuth(req, res, next) {
  if (req.user && req.user.role === 'seller') return next();
  return res.status(403).json({ error: 'No autorizado' });
}

// CRUD de clientes
router.get('/clients', verifyToken, sellerAuth, async (req, res) => {
  try {
    const clients = await Client.find({ seller: req.user.id });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clientes', details: err.message });
  }
});

router.post('/clients', verifyToken, sellerAuth, async (req, res) => {
  try {
    const { name, contact, address, notes, image } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
    
    if (!req.user.zone) {
      return res.status(400).json({ error: 'El vendedor no tiene una zona asignada' });
    }

    let code;
    let unique = false;
    while (!unique) {
      code = generateClientCode(name);
      const codeExists = await Client.findOne({ code });
      if (!codeExists) unique = true;
    }

    const client = new Client({
      name,
      contact: contact || '',
      address: address || '',
      notes: notes || '',
      image: image || '',
      zone: req.user.zone,
      seller: req.user.id,
      code
    });

    await client.save();
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ 
      error: 'Error al crear cliente', 
      details: err.message,
      validationErrors: err.errors
    });
  }
});

router.put('/clients/:id', verifyToken, sellerAuth, async (req, res) => {
  try {
    const { name, contact, address, notes, image } = req.body;
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, seller: req.user.id },
      { name, contact, address, notes, image },
      { new: true, runValidators: true }
    );
    
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado o no autorizado' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar cliente', details: err.message });
  }
});

router.delete('/clients/:id', verifyToken, sellerAuth, async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, seller: req.user.id });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado o no autorizado' });
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar cliente', details: err.message });
  }
});

// Obtener detalle de cliente
router.get('/clients/:id', verifyToken, sellerAuth, async (req, res) => {
  try {
    console.log('req.user.id:', req.user.id);
    console.log('req.params.id:', req.params.id);
    const client = await Client.findOne({ _id: req.params.id, seller: req.user.id });
    console.log('client found:', client);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(client);
  } catch (err) {
    console.error('Error al obtener cliente:', err);
    res.status(500).json({ error: 'Error al obtener cliente', details: err.message });
  }
});

router.get('/zone-summary', verifyToken, sellerAuth, async (req, res) => {
  try {
    const clients = await Client.find({ seller: req.user.id });
    const totalClients = clients.length;

    // Obtener códigos, nombres y teléfonos de clientes
    const clientCodes = clients.map(c => c.code);
    const clientNames = clients.map(c => c.name);
    const clientContacts = clients.map(c => c.contact);

    // Obtener datos del vendedor líder para nombre y teléfono
    const seller = await Seller.findById(req.user.id);

    // DEBUG: imprimir sellerCode de órdenes del vendedor
    const leaderOrders = await Order.find({ sellerCode: { $regex: `^${req.user.sellerCode}$`, $options: 'i' } });
    console.log('Código del líder:', req.user.sellerCode);
    console.log('Órdenes con sellerCode igual al código del líder:', leaderOrders.map(o => o.sellerCode));

    // Ventas personales del vendedor líder (conteo) por sellerCode o sellerName igual al líder (sin sellerPhone)
    // Ventas personales del vendedor líder (conteo) por sellerCode o sellerName igual al líder
    const totalSalesLeader = await Order.countDocuments({
      $or: [
        { sellerCode: { $regex: `^${req.user.code}$`, $options: 'i' } },
        { sellerName: { $regex: `^${seller.name}$`, $options: 'i' } }
      ]
    });

    // Ventas de personas a cargo (conteo) por sellerCode, sellerName o sellerPhone en personas a cargo, excluyendo ventas personales
    const totalSalesClients = await Order.countDocuments({
      $and: [
        {
          $or: [
            { sellerCode: { $in: clientCodes.filter(code => code !== req.user.code) } },
            { sellerName: { $in: clientNames } },
            { sellerPhone: { $in: clientContacts } }
          ]
        },
        { sellerCode: { $ne: req.user.code } },
        { seller: { $ne: req.user.id } }
      ]
    });

    const response = {
      zone: req.user.zone,
      totalClients,
      totalSalesClients,
      totalSalesLeader,
      sellerCode: req.user.sellerCode,
      sellerName: seller.name
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener resumen', details: err.message });
  }
});

// Perfil del vendedor
router.get('/profile', verifyToken, sellerAuth, async (req, res) => {
  try {
    const seller = await Seller.findById(req.user.id).select('-password');
    if (!seller) return res.status(404).json({ error: 'Vendedor no encontrado' });
    res.json(seller);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener perfil', details: err.message });
  }
});

// Cambiar contraseña
router.put('/change-password', verifyToken, sellerAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Contraseña inválida (mínimo 6 caracteres)' });
    }

    const seller = await Seller.findById(req.user.id);
    if (!seller) return res.status(404).json({ error: 'Vendedor no encontrado' });

    const match = await seller.comparePassword(currentPassword);
    if (!match) return res.status(400).json({ error: 'Contraseña actual incorrecta' });

    seller.password = newPassword;
    await seller.save();
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar contraseña', details: err.message });
  }
});

// Buscar vendedor por código
router.get('/by-code/:code', async (req, res) => {
  try {
    const seller = await Seller.findOne({ code: req.params.code.toUpperCase() })
      .select('-password');
      
    if (!seller) return res.status(404).json({ error: 'Vendedor no encontrado' });
    res.json(seller);
  } catch (err) {
    res.status(500).json({ error: 'Error al buscar vendedor', details: err.message });
  }
});

module.exports = router;