
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./db/connection');
const { connectMQTT } = require('./mqtt/mqttClient');
const lecturaRoutes = require('./routes/lectura.routes');
const { logger } = require('./utils/logger');

const app = express();
app.use(express.json())
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express.json());
app.use(cors());

const authRoutes = require('./routes/auth.routes')
app.use('/api', authRoutes)

const empresaRoutes = require('./routes/empresa.routes')
app.use('/api/empresas', empresaRoutes)

const usuarioRoutes = require('./routes/usuario.routes')
app.use('/api', usuarioRoutes)

// Rutas
app.use('/api/lecturas', lecturaRoutes);

// Ruta de test
app.get('/ping', (req, res) => res.send('pong'));

// Inicialización
async function startServer() {
  await connectDB();
  connectMQTT();

  app.listen(PORT, '0.0.0.0', () => {
    logger(`🚀 Backend escuchando en http://0.0.0.0:${PORT}`);
  });
}

startServer();
