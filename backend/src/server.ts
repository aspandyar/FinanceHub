import app from './app.js';
import config from './config/config.js';
import { initializeDatabase } from './config/database.js';

const startServer = async () => {
  try {
    // Initialize database connection and tables
    await initializeDatabase();
    
    // Start the server
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();