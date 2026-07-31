import { describe, it, expect } from 'vitest';
import { TimestampStrategy } from '../src/comparison/TimestampStrategy';
import { ModCountStrategy } from '../src/comparison/ModCountStrategy';
import { ChecksumStrategy } from '../src/comparison/ChecksumStrategy';
import { ComparisonEngine } from '../src/comparison/ComparisonEngine';
import { InstanceConfig, SNRecordData } from '../src/models/types';

describe('ComparisonEngine & Strategies Suite', () => {
  const devInst: InstanceConfig = { name: 'dev', hostname: 'dev.service-now.com', tier: 'dev', authType: 'oauth' };
  const testInst: InstanceConfig = { name: 'test', hostname: 'test.service-now.com', tier: 'test', authType: 'oauth' };

  it('should detect outdated record using TimestampStrategy', () => {
    const local: SNRecordData = {
      sys_id: '123',
      sys_updated_on: '2026-07-01 10:00:00',
      sys_updated_by: 'user1',
      sys_mod_count: 1,
      content: 'var x = 1;',
      rawFields: {}
    };
    const higher: SNRecordData = {
      sys_id: '123',
      sys_updated_on: '2026-07-02 12:00:00',
      sys_updated_by: 'lead_dev',
      sys_mod_count: 3,
      content: 'var x = 2;',
      rawFields: {}
    };

    const res = TimestampStrategy.compare(devInst, testInst, local, higher);
    expect(res.isOutdated).toBe(true);
    expect(res.strategyUsed).toBe('sys_updated_on');
  });

  it('should detect mod count disparity using ModCountStrategy', () => {
    const local: SNRecordData = { sys_id: '123', sys_updated_on: '2026-07-01 10:00:00', sys_updated_by: 'user1', sys_mod_count: 5, content: 'a', rawFields: {} };
    const higher: SNRecordData = { sys_id: '123', sys_updated_on: '2026-07-01 10:00:00', sys_updated_by: 'user2', sys_mod_count: 10, content: 'a', rawFields: {} };

    const res = ModCountStrategy.compare(devInst, testInst, local, higher);
    expect(res.isOutdated).toBe(true);
    expect(res.modCountDifference).toBe(5);
  });

  it('should compute SHA-256 hash and detect script change via ChecksumStrategy', () => {
    const hash1 = ChecksumStrategy.computeHash('var a = 100;');
    const hash2 = ChecksumStrategy.computeHash('var a = 200;');
    expect(hash1).not.toBe(hash2);
  });

  it('should perform full evaluation using ComparisonEngine', () => {
    const local: SNRecordData = { sys_id: 'abc', sys_updated_on: '2026-01-01 00:00:00', sys_updated_by: 'u1', sys_mod_count: 1, content: 'code1', rawFields: {} };
    const higher: SNRecordData = { sys_id: 'abc', sys_updated_on: '2026-02-01 00:00:00', sys_updated_by: 'u2', sys_mod_count: 2, content: 'code2', rawFields: {} };

    const res = ComparisonEngine.compare(devInst, testInst, local, higher, 'hybrid');
    expect(res.isOutdated).toBe(true);
    expect(res.fieldDiffs.length).toBeGreaterThan(0);
  });
});
