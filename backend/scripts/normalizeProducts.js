// Script para normalizar productos antiguos en MongoDB
// Ejecuta: node backend/scripts/normalizeProducts.js

const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGO_URI = process.env.MONGO_URI || 'TU_MONGO_ATLAS_URI_AQUI'; // Cambia esto si es necesario

function normalizeStringArray(val) {
  if (Array.isArray(val)) {
    return val.flatMap(v =>
      typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : []
    );
  }
  if (typeof val === 'string') {
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

async function normalizeProducts() {
  await mongoose.connect(MONGO_URI);
  const products = await Product.find({});
  let updated = 0;
  for (const product of products) {
    let changed = false;
    // Normalizar sizes
    const normSizes = normalizeStringArray(product.sizes);
    if (JSON.stringify(normSizes) !== JSON.stringify(product.sizes)) {
      product.sizes = normSizes;
      changed = true;
    }
    // Normalizar colors
    const normColors = normalizeStringArray(product.colors);
    if (JSON.stringify(normColors) !== JSON.stringify(product.colors)) {
      product.colors = normColors;
      changed = true;
    }
    // Limpiar imágenes vacías
    if (Array.isArray(product.images)) {
      const cleanImages = product.images.filter(img => typeof img === 'string' && img.trim() !== '');
      if (JSON.stringify(cleanImages) !== JSON.stringify(product.images)) {
        product.images = cleanImages;
        changed = true;
      }
    }
    if (changed) {
      await product.save();
      updated++;
    }
  }
  console.log(`Productos actualizados: ${updated}`);
  await mongoose.disconnect();
}

normalizeProducts().catch(err => {
  console.error('Error normalizando productos:', err);
  process.exit(1);
});
