/**
 * Vercel Serverless Function entry point for ERPNext proxy.
 * Exports Express app to handle /api/erp/* and /health when deployed on Vercel.
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import { erpRouter } from '../src/server/erpProxy.ts';

const app = express();
app.set('trust proxy', 1);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    platform: 'vercel-serverless',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    platform: 'vercel-serverless',
  });
});

// Mount ERPNext router on both paths to handle rewrites and direct calls
app.use('/api/erp', erpRouter);
app.use('/erp', erpRouter);

export default app;
