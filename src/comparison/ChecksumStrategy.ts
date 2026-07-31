import * as crypto from 'crypto';
import { SNRecordData, ComparisonResult, InstanceConfig } from '../models/types';

export class ChecksumStrategy {
  /**
   * Generates SHA-256 hash of text content, with optional line ending / whitespace normalization
   */
  public static computeHash(content: string = '', ignoreWhitespace: boolean = true): string {
    let normalized = content;
    if (ignoreWhitespace) {
      normalized = content
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+$/gm, '')
        .trim();
    }
    return crypto.createHash('sha256').update(normalized, 'utf-8').digest('hex');
  }

  /**
   * Compares lower record and higher record by content checksum
   */
  public static compare(
    currentInstance: InstanceConfig,
    higherInstance: InstanceConfig,
    localRecord: SNRecordData,
    higherRecord: SNRecordData,
    ignoreWhitespace: boolean = true
  ): Partial<ComparisonResult> {
    const localHash = localRecord.checksum || ChecksumStrategy.computeHash(localRecord.content, ignoreWhitespace);
    const higherHash = higherRecord.checksum || ChecksumStrategy.computeHash(higherRecord.content, ignoreWhitespace);

    const isOutdated = localHash !== higherHash;

    let reason = 'Content checksums match perfectly.';
    if (isOutdated) {
      reason = `Content checksum mismatch detected with higher instance (${higherInstance.name}). Higher instance code was modified by ${higherRecord.sys_updated_by}.`;
    }

    return {
      isOutdated,
      strategyUsed: 'checksum',
      reason
    };
  }
}
