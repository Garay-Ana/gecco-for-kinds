const jwt = require('jsonwebtoken');
const Seller = require('../models/Seller'); // Asegúrate de importar el modelo

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Si es vendedor, buscamos sus datos completos
if (decoded.role === 'seller') {
      const seller = await Seller.findById(decoded.id);
      if (!seller) return res.status(401).json({ error: 'Vendedor no encontrado' });

      req.user = {
        id: seller._id,
        role: decoded.role,
        name: seller.name,
        sellerCode: seller.code,
        zone: seller.zone
      };
    } else {
      // Para otros roles
      req.user = {
        id: decoded.id,
        role: decoded.role
      };
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = verifyToken;
