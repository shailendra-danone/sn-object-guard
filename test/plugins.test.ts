import { describe, it, expect } from 'vitest';
import { ExtensibilityManager } from '../src/plugins/ExtensibilityManager';
import { IMergeConflictPlugin } from '../src/plugins/IMergeConflictPlugin';

describe('Extensibility & Plugin Suite', () => {
  it('should register and execute merge conflict plugins', async () => {
    const manager = ExtensibilityManager.getInstance();

    const mockPlugin: IMergeConflictPlugin = {
      id: 'test-merge-plugin',
      name: 'Test Merge Conflict Detector',
      async detectMergeConflicts(context) {
        return {
          hasConflict: true,
          conflictLines: [{ line: 5, localText: 'var a=1;', higherText: 'var a=2;' }]
        };
      }
    };

    manager.registerMergeConflictPlugin(mockPlugin);

    const results = await manager.runMergeConflictDetection({
      localRecord: { sys_id: '1', sys_updated_on: '', sys_updated_by: '', sys_mod_count: 1, rawFields: {} },
      higherRecord: { sys_id: '1', sys_updated_on: '', sys_updated_by: '', sys_mod_count: 2, rawFields: {} },
      currentInstance: { name: 'dev', hostname: 'dev.com', tier: 'dev', authType: 'oauth' },
      higherInstance: { name: 'test', hostname: 'test.com', tier: 'test', authType: 'oauth' }
    });

    expect(results.length).toBe(1);
    expect(results[0].hasConflict).toBe(true);
    expect(results[0].conflictLines[0].line).toBe(5);
  });
});
