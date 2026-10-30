/**
 * Vercel Serverless Function catch-all route handler.
 * Re-exports the Express app from api/index.ts for file-system routing.
 */

import app from './index.ts';

export default app;
