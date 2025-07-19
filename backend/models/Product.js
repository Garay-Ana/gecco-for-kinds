const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
  images: [String], // Permite galería de imágenes
  description: String,
  stock: Number,
  sizes: [String], // Tallas disponibles
  colors: { type: [String], default: [] }, // Colores disponibles (opcional)
  category: { type: String, default: '' } // Nuevo campo para categoría
});

module.exports = mongoose.model('Product', productSchema);
