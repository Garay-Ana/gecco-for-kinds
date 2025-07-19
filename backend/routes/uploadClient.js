const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const upload = multer({
  dest: path.join(__dirname, '../uploads/clients'),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Subida de imagen/documento para cliente
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió archivo' });
  // Puedes mover el archivo o subirlo a cloudinary aquí si lo deseas
  const url = `/uploads/clients/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;
