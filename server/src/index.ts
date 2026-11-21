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
import cors from 'cors';
import { securityHeaders, sanitizeInputs } from './middleware/security';
import issuesRouter from './routes/issues';
import * as storageService from './services/storageService';

const app = express();

app.use(securityHeaders);
app.use(cors());
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
