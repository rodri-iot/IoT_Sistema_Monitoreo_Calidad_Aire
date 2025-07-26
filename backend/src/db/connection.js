
const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger('🟢 Conectado a MongoDB');
  } catch (err) {
    logger('🔴 Error al conectar a MongoDB:', err);
    process.exit(1);
  }
}

module.exports = { connectDB };
