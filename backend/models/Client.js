const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String },
  address: { type: String },
  zone: { type: String, required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
  notes: { type: String },
  sales: { type: Number, default: 0 },
  image: { type: String }, // URL de imagen o documento opcional
  code: { type: String, required: true, unique: true }, // Código único de cliente
});

module.exports = mongoose.model('Client', clientSchema);
