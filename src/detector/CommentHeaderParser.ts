import { SNRecordIdentifier } from '../models/types';

export class CommentHeaderParser {
  /**
   * Parses comment headers from script text (e.g. JavaScript, XML, HTML, JSON comments)
   */
  public static parse(content: string, defaultInstance?: string): Partial<SNRecordIdentifier> | null {
    if (!content) return null;

    const lines = content.split(/\r?\n/).slice(0, 35); // Check top 35 lines
    const text = lines.join('\n');

    // Patterns for instance
    const instanceMatch = 
      text.match(/(?:@instance|Instance:|\binstance\b[:=])\s*([a-zA-Z0-9.-]+\.service-now\.com|[a-zA-Z0-9_-]+)/i);

    // Patterns for table
    const tableMatch = 
      text.match(/(?:@table|Table:|\btable\b[:=])\s*([a-zA-Z0-9_]+)/i);

    // Patterns for sys_id (32 hex characters)
    const sysIdMatch = 
      text.match(/(?:@sys_id|sys_id:|\bSysId\b[:=]|\bsys_id\b[:=])\s*([a-fA-F0-9]{32})/i) ||
      text.match(/\b([a-fA-F0-9]{32})\b/);

    // Patterns for record name
    const nameMatch = 
      text.match(/(?:@name|Name:|\bname\b[:=])\s*(.+)$/im);

    if (sysIdMatch) {
      return {
        instance: instanceMatch ? instanceMatch[1] : defaultInstance,
        table: tableMatch ? tableMatch[1] : undefined,
        sys_id: sysIdMatch[1],
        name: nameMatch ? nameMatch[1].trim() : undefined
      };
    }

    return null;
  }
}
