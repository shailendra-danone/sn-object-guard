import { describe, it, expect } from 'vitest';
import { ConfigManager } from '../src/config/ConfigManager';

describe('ConfigManager Suite', () => {
  it('should load default config and resolve higher instance correctly', () => {
    const config = ConfigManager.loadConfigFile();
    expect(config.enabled).toBe(true);
    expect(config.pipeline.chain).toEqual(['dev', 'test', 'uat', 'prod']);

    const higherOfDev = ConfigManager.getHigherInstance('dev', config);
    expect(higherOfDev).not.toBeNull();
    expect(higherOfDev?.tier).toBe('test');

    const higherOfTest = ConfigManager.getHigherInstance('test', config);
    expect(higherOfTest?.tier).toBe('uat');

    const higherOfProd = ConfigManager.getHigherInstance('prod', config);
    expect(higherOfProd).toBeNull();
  });
});
