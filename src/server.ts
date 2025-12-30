import app from './app.js';
import config from './config/config.js';

const startServer = async () => {
  try {
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