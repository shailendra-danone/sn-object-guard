import * as path from 'path';
import { SNRecordIdentifier } from '../models/types';

export class PathPatternParser {
  private static knownTables = [
    'sys_script_include',
    'sys_ui_script',
    'sys_script',
    'sys_ui_policy',
    'sys_client_script',
    'sp_widget',
    'sys_widgets',
    'sys_ws_definition',
    'sys_transform_script',
    'sys_dictionary'
  ];

  /**
   * Parses file path structure to infer table, instance, and sys_id/name
   */
  public static parse(filePath: string, defaultInstance?: string): Partial<SNRecordIdentifier> | null {
    if (!filePath) return null;

    const normalizedPath = filePath.replace(/\\/g, '/');
    const segments = normalizedPath.split('/');
    const fileName = path.basename(normalizedPath);

    // Look for sys_id in filename (e.g. 32-char hex string)
    const sysIdInFileName = fileName.match(/^([a-fA-F0-9]{32})(?:\..+)?$/);

    // Search for known table in path segments
    let detectedTable: string | undefined;
    let detectedInstance: string | undefined = defaultInstance;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i].toLowerCase();
      
      // Check instance hostname or name segment
      if (seg.includes('.service-now.com') || seg.startsWith('sn-') || seg === 'dev' || seg === 'test' || seg === 'uat' || seg === 'prod') {
        detectedInstance = seg;
      }

      // Check table match
      if (PathPatternParser.knownTables.includes(seg) || seg.startsWith('sys_') || seg.startsWith('sp_')) {
        detectedTable = segments[i];
      }
    }

    if (sysIdInFileName && detectedTable) {
      return {
        instance: detectedInstance,
        table: detectedTable,
        sys_id: sysIdInFileName[1],
        localPath: filePath
      };
    }

    // Check if filename without extension is 32-hex characters
    const baseNameNoExt = fileName.replace(/\.[^/.]+$/, '');
    if (/^[a-fA-F0-9]{32}$/.test(baseNameNoExt)) {
      return {
        instance: detectedInstance,
        table: detectedTable || 'sys_script_include',
        sys_id: baseNameNoExt,
        localPath: filePath
      };
    }

    // If filename has a name (e.g. MyScriptInclude.js) and folder is sys_script_include
    if (detectedTable && baseNameNoExt) {
      return {
        instance: detectedInstance,
        table: detectedTable,
        name: baseNameNoExt,
        localPath: filePath
      };
    }

    return null;
  }
}
