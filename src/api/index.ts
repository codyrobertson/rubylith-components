/**
 * API server entry point
 * Starts the Express server
 */

import { apiServer } from './server';
import { validateConfig } from './config';

// Validate configuration before starting
validateConfig();

// Start server
apiServer.start().catch(error => {
  console.error('Failed to start API server:', error);
  process.exit(1);
});

// Export for testing
export { apiServer };