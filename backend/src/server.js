
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./db/connection');
const { connectMQTT } = require('./mqtt/mqttClient');
const Dispositivo = require('./db/Dispositivo');
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

const dispositivoRoutes = require('./routes/dispositivo.routes')
app.use('/api/dispositivos', dispositivoRoutes)

const zonaRoutes = require('./routes/zona.routes')
app.use('/api/zonas', zonaRoutes)

const sseRoutes = require('./routes/sse.routes')
app.use('/api/sse', sseRoutes)

const publicoRoutes = require('./routes/publico.routes')
app.use('/api/publico', publicoRoutes)

// Rutas
app.use('/api/lecturas', lecturaRoutes);

// Ruta de test
app.get('/ping', (req, res) => res.send('pong'));

// Marcar dispositivos inactivos si ultimaLectura > 5 min (para indicador MQTT)
function startInactividadJob() {
  setInterval(async () => {
    try {
      const hace5min = new Date();
      hace5min.setMinutes(hace5min.getMinutes() - 5);
      const res = await Dispositivo.updateMany(
        { ultimaLectura: { $lt: hace5min }, estado: 'activo' },
        { $set: { estado: 'inactivo' } }
      );
      if (res.modifiedCount > 0) {
        logger(`📴 ${res.modifiedCount} dispositivo(s) marcados inactivos (sin lecturas > 5 min)`);
      }
    } catch (err) {
      logger('Error en job inactividad:', err?.message);
    }
  }, 60000);
}

// Inicialización
async function startServer() {
  await connectDB();
  connectMQTT();
  startInactividadJob();

  app.listen(PORT, '0.0.0.0', () => {
    logger(`🚀 Backend escuchando en http://0.0.0.0:${PORT}`);
  });
}

startServer();
