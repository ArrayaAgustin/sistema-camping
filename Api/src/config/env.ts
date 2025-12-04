import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Configuración de la aplicación basada en variables de entorno
 */
export interface IAppConfig {
  // Server Configuration
  PORT: number;
  NODE_ENV: string;
  
  // Database Configuration
  DATABASE_URL: string;
  
  // JWT Configuration
  JWT_SECRET: string;
  JWT_EXPIRES: string;
  
  // Security Configuration
  BCRYPT_ROUNDS: number;
  
  // CORS Configuration
  CORS_ORIGIN: string;
  
  // Logging
  LOG_LEVEL: string;
}

/**
 * Configuración validada de la aplicación
 */
export const config: IAppConfig = {
  // Server Configuration
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'cambiame_en_produccion',
  JWT_EXPIRES: process.env.JWT_EXPIRES || '8h',
  
  // Security Configuration
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'dev'
};

/**
 * Valida que todas las configuraciones requeridas estén presentes
 */
function validateConfig(): void {
  const requiredFields: (keyof IAppConfig)[] = ['DATABASE_URL'];
  
  for (const field of requiredFields) {
    if (!config[field]) {
      console.error(`❌ ERROR: ${field} is required`);
      process.exit(1);
    }
  }
  
  // Validaciones adicionales
  if (config.NODE_ENV === 'production' && config.JWT_SECRET === 'cambiame_en_produccion') {
    console.error('❌ ERROR: JWT_SECRET must be changed in production');
    process.exit(1);
  }
  
  if (config.BCRYPT_ROUNDS < 8 || config.BCRYPT_ROUNDS > 15) {
    console.error('❌ ERROR: BCRYPT_ROUNDS must be between 8 and 15');
    process.exit(1);
  }
}

// Validar configuración al cargar el módulo
validateConfig();

// Mostrar configuración en desarrollo
if (config.NODE_ENV === 'development') {
  console.log('🔧 Configuration loaded:');
  console.log(`   - PORT: ${config.PORT}`);
  console.log(`   - NODE_ENV: ${config.NODE_ENV}`);
  console.log(`   - DATABASE_URL: ${config.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - JWT_SECRET: ${config.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - BCRYPT_ROUNDS: ${config.BCRYPT_ROUNDS}`);
}

export default config;