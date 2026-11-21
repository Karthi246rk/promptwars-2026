import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from root or parent directories
const envLocations = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
];
for (const envPath of envLocations) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { securityHeaders, sanitizeInputs } from './middleware/security';
import issuesRouter from './routes/issues';
import * as storageService from './services/storageService';

const app = express();

// Helmet security headers (with CSP disabled for external map tiles & fonts)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Standard explicit security headers
app.use(securityHeaders);

// Configurable CORS via ALLOWED_ORIGIN env var instead of open wildcard
const allowedOriginEnv = process.env.ALLOWED_ORIGIN;
const allowedOrigins = allowedOriginEnv
  ? allowedOriginEnv.split(',').map((o) => o.trim())
  : undefined;

app.use(
  cors({
    origin: allowedOrigins && allowedOrigins.length > 0
      ? (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
          } else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
          }
        }
      : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(sanitizeInputs);

app.use(issuesRouter);

// Serve compiled React frontend if client/dist exists
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

const port = process.env.PORT || 8080;

if (require.main === module) {
  storageService.initialize().then(() => {
    app.listen(port, () => {
      console.log(`🏛️ CivicResolve server running on port ${port}`);
    });
  }).catch((err) => {
    console.error('Failed to initialize storage:', err);
    process.exit(1);
  });
}

export default app;
