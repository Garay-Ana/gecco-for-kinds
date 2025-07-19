// Script para limpiar y corregir categorías mal escritas en productos de MongoDB
// Ejecuta este script con `node fixProductCategories.js` en la carpeta backend

const mongoose = require('mongoose');

const uri = 'mongodb://localhost:27017/Tienda'; // Cambia si tu conexión es diferente
const Product = require('./models/Product');

const CATEGORY_MAP = {
  'ropa para nino': 'Ropa para Niño',
  'ropa para niño': 'Ropa para Niño',
  'ropa para nina': 'Ropa para Niña',
  'ropa para niña': 'Ropa para Niña',
  'Ropa para Niño': 'Ropa para Niño',
  'Ropa para Niña': 'Ropa para Niña',
  'Ropa Para Niño': 'Ropa para Niño',
  'Ropa Para Niña': 'Ropa para Niña',
  'niño': 'Ropa para Niño',
  'nino': 'Ropa para Niño',
  'niña': 'Ropa para Niña',
  'nina': 'Ropa para Niña',
};

async function fixCategories() {
  await mongoose.connect(uri);
  const products = await Product.find();
  let updated = 0;
  for (const product of products) {
    let original = product.category;
    if (!original) continue;
    // Limpiar espacios y normalizar
    original = original.trim();
    const normalized = original.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const fixed = CATEGORY_MAP[original] || CATEGORY_MAP[normalized] || null;
    if (fixed && product.category !== fixed) {
      product.category = fixed;
      await product.save();
      updated++;
      console.log(`Actualizado: ${product.name} -> ${fixed}`);
    } else if (product.category !== original) {
      product.category = original;
      await product.save();
      updated++;
      console.log(`Espacios limpiados: ${product.name} -> ${original}`);
    }
  }
  console.log(`Productos actualizados: ${updated}`);
  await mongoose.disconnect();
}

fixCategories().catch(console.error);
