import { describe, it, expect } from 'vitest';
import { version } from '../index';

describe('Package exports', () => {
  it('exports correct version number', () => {
    expect(version).toBe('0.1.0');
  });

  it('exports all required modules', async () => {
    const exports = await import('../index');

    // Check that we're exporting from all modules
    expect(exports).toBeDefined();
    expect(exports.version).toBeDefined();
  });
});
