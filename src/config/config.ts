import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  apiUrl: {
    dev: string;
    prod: string;
  };
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    url: string;
    ssl: boolean | { rejectUnauthorized: boolean };
  };
}

const port = Number(process.env.PORT) || 3000;

const config: Config = {
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  apiUrl: {
    dev: process.env.API_URL_DEV || `http://localhost:${port}`,
    prod: process.env.API_URL_PROD || 'https://api.financehub.com',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'financehub_user',
    password: process.env.DB_PASSWORD || 'financehub_password',
    database: process.env.DB_NAME || 'financehub_db',
    url: process.env.DATABASE_URL || 'postgresql://financehub_user:financehub_password@localhost:5432/financehub_db',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
};

export default config;