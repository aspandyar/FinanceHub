import app from './app.js';
import config from './config/config.js';
import { initializeAdmin } from './utils/initAdmin.js';

const startServer = async () => {
  try {
    // Initialize admin user if no users exist
    await initializeAdmin();

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