import express from 'express';
import itemRoutes from './routes/itemRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(express.json());

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;