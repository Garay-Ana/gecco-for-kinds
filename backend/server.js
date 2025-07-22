const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://gecco-for-kinds.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Cargar archivo .env manualmente si existe
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  console.warn('.env file not found at', envPath);
}

app.use(cors());
app.use(express.json());

// Rutas
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const sellerRoutes = require('./routes/sellers');
const uploadClientRoutes = require('./routes/uploadClient');
const productDetailsRoutes = require('./routes/productDetails');
const salesRoutes = require('./routes/sales');
const adminSellersRoutes = require('./routes/adminSellers');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/upload-client', uploadClientRoutes);
app.use('/api/product-details', productDetailsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/admin-sellers', adminSellersRoutes);

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
  })
  .catch(err => console.log(err));
