const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Admin = require('./models/Admin'); // Asegúrate de tener este modelo

async function crearAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    const email = 'admin@tienda.com';
    const passwordPlano = '123456';

    // Verificar si ya existe
    const existe = await Admin.findOne({ email });
    if (existe) {
      console.log('⚠️ Ya existe un admin con ese correo');
      return;
    }

    const passwordHasheada = await bcrypt.hash(passwordPlano, 10);

    const admin = new Admin({ email, password: passwordHasheada });
    await admin.save();

    console.log('✅ Admin creado con éxito:', email);
    process.exit();
  } catch (err) {
    console.error('❌ Error al crear admin:', err);
    process.exit(1);
  }
}

crearAdmin();
