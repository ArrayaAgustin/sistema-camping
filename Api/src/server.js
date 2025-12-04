require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

// Importar configuración centralizada de rutas
const { setupRoutes } = require('./routes');

const app = express();

// Middlewares globales
app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Configurar todas las rutas
setupRoutes(app);

const PORT = process.env.PORT || 3001;

// Error handling mejorado
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  // No hacer process.exit() para debugging
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  console.error('Stack:', err.stack);
});

app.listen(PORT, () => {
  console.log(`🚀 API listening on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/`);
  console.log(`🔐 Login: POST http://localhost:${PORT}/auth/login`);
});