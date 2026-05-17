import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import passport from './services/passport';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { startCronJobs } from './services/cronService';

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Middleware
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport (no sessions — JWT only)
app.use(passport.initialize());

// API Routes
app.use('/api', router);

// Serve React frontend in production
if (isProd) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // Handle client-side routing — return index.html for all non-API routes
  app.get(/(.*)/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 DCAlog server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  startCronJobs();
});

export default app;
