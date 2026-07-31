import { describe, it, expect } from 'vitest';
import { CacheManager } from '../src/api/CacheManager';

describe('CacheManager Suite', () => {
  it('should store, retrieve, and expire items correctly', async () => {
    const cache = new CacheManager();
    cache.set('testInst', 'sys_script_include', 'sys123', { name: 'MyScript' }, 1); // 1 second TTL

    const cached = cache.get('testInst', 'sys_script_include', 'sys123');
    expect(cached).toEqual({ name: 'MyScript' });

    // Wait 1.1s for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));

    const expired = cache.get('testInst', 'sys_script_include', 'sys123');
    expect(expired).toBeNull();
  });
});
