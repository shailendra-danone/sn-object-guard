import { CommentHeaderParser } from './CommentHeaderParser';
import { PathPatternParser } from './PathPatternParser';
import { MetadataFileParser } from './MetadataFileParser';
import { SNRecordIdentifier, GuardConfig } from '../models/types';

export class RecordDetector {
  /**
   * Detects ServiceNow record details from file content and file path.
   */
  public static detect(filePath: string, fileContent: string, config?: GuardConfig): SNRecordIdentifier | null {
    const defaultInstance = config ? Object.keys(config.instances)[0] : 'dev';

    // 1. Try Comment Header Parser (highest precedence)
    const headerResult = CommentHeaderParser.parse(fileContent, defaultInstance);
    if (headerResult && headerResult.sys_id) {
      return {
        instance: headerResult.instance || defaultInstance,
        table: headerResult.table || 'sys_script_include',
        sys_id: headerResult.sys_id,
        name: headerResult.name,
        scriptField: config?.tables[headerResult.table || '']?.scriptField || 'script',
        localPath: filePath
      };
    }

    // 2. Try Metadata Companion File
    const metaResult = MetadataFileParser.parse(filePath);
    if (metaResult && metaResult.sys_id) {
      return {
        instance: metaResult.instance || defaultInstance,
        table: metaResult.table || 'sys_script_include',
        sys_id: metaResult.sys_id,
        name: metaResult.name,
        scriptField: config?.tables[metaResult.table || '']?.scriptField || 'script',
        localPath: filePath
      };
    }

    // 3. Try Path Pattern Parser
    const pathResult = PathPatternParser.parse(filePath, defaultInstance);
    if (pathResult && pathResult.sys_id) {
      return {
        instance: pathResult.instance || defaultInstance,
        table: pathResult.table || 'sys_script_include',
        sys_id: pathResult.sys_id,
        name: pathResult.name,
        scriptField: config?.tables[pathResult.table || '']?.scriptField || 'script',
        localPath: filePath
      };
    }

    return null;
  }
}
