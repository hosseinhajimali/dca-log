import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { startCronJobs } from './services/cronService';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', router);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 myDCA server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  startCronJobs();
});

export default app;
