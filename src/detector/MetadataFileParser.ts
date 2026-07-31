import * as fs from 'fs';
import * as path from 'path';
import { SNRecordIdentifier } from '../models/types';

export class MetadataFileParser {
  /**
   * Checks for companion .sn-meta.json or <filename>.sn-meta.json file
   */
  public static parse(filePath: string): Partial<SNRecordIdentifier> | null {
    if (!filePath) return null;

    const dir = path.dirname(filePath);
    const fileName = path.basename(filePath);

    const companionPaths = [
      path.join(dir, `${fileName}.sn-meta.json`),
      path.join(dir, `.sn-meta.json`),
      path.join(dir, `${path.parse(fileName).name}.json`)
    ];

    for (const metaPath of companionPaths) {
      if (fs.existsSync(metaPath)) {
        try {
          const content = fs.readFileSync(metaPath, 'utf-8');
          const data = JSON.parse(content);
          if (data.sys_id || data.sysId) {
            return {
              instance: data.instance || data.hostname,
              table: data.table || data.tableName,
              sys_id: data.sys_id || data.sysId,
              name: data.name || data.recordName,
              localPath: filePath
            };
          }
        } catch {
          // ignore invalid json
        }
      }
    }

    return null;
  }
}
