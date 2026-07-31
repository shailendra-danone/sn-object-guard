import { describe, it, expect } from 'vitest';
import { CommentHeaderParser } from '../src/detector/CommentHeaderParser';
import { PathPatternParser } from '../src/detector/PathPatternParser';
import { RecordDetector } from '../src/detector/RecordDetector';

describe('RecordDetector Suite', () => {
  it('should parse metadata from comment headers', () => {
    const content = `
      // Instance: danonedev.service-now.com
      // Table: sys_script_include
      // SysId: c62997741b61ac50285ced7cee4bcbfa
      // Name: MyTestScriptInclude
      var MyTestScriptInclude = Class.create();
    `;
    const res = CommentHeaderParser.parse(content);
    expect(res).not.toBeNull();
    expect(res?.instance).toBe('danonedev.service-now.com');
    expect(res?.table).toBe('sys_script_include');
    expect(res?.sys_id).toBe('c62997741b61ac50285ced7cee4bcbfa');
    expect(res?.name).toBe('MyTestScriptInclude');
  });

  it('should parse metadata from file paths', () => {
    const filePath = 'C:/projects/danonedev/sys_script_include/c62997741b61ac50285ced7cee4bcbfa.js';
    const res = PathPatternParser.parse(filePath);
    expect(res).not.toBeNull();
    expect(res?.sys_id).toBe('c62997741b61ac50285ced7cee4bcbfa');
    expect(res?.table).toBe('sys_script_include');
  });

  it('should orchestrate detection via RecordDetector', () => {
    const content = '// sys_id: 11112222333344445555666677778888';
    const filePath = 'test.js';
    const res = RecordDetector.detect(filePath, content);
    expect(res).not.toBeNull();
    expect(res?.sys_id).toBe('11112222333344445555666677778888');
  });
});
