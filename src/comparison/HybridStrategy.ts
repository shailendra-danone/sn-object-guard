import { SNRecordData, ComparisonResult, InstanceConfig } from '../models/types';
import { TimestampStrategy } from './TimestampStrategy';
import { ModCountStrategy } from './ModCountStrategy';
import { ChecksumStrategy } from './ChecksumStrategy';

export class HybridStrategy {
  /**
   * Performs hybrid multi-factor comparison combining timestamp, mod count, and checksum
   */
  public static compare(
    currentInstance: InstanceConfig,
    higherInstance: InstanceConfig,
    localRecord: SNRecordData,
    higherRecord: SNRecordData,
    ignoreWhitespace: boolean = true
  ): Partial<ComparisonResult> {
    const timeRes = TimestampStrategy.compare(currentInstance, higherInstance, localRecord, higherRecord);
    const modRes = ModCountStrategy.compare(currentInstance, higherInstance, localRecord, higherRecord);
    const checkRes = ChecksumStrategy.compare(currentInstance, higherInstance, localRecord, higherRecord, ignoreWhitespace);

    const isOutdated = !!(timeRes.isOutdated || modRes.isOutdated || checkRes.isOutdated);

    const reasons: string[] = [];
    if (timeRes.isOutdated) reasons.push(timeRes.reason || '');
    if (modRes.isOutdated) reasons.push(modRes.reason || '');
    if (checkRes.isOutdated && !timeRes.isOutdated) reasons.push(checkRes.reason || '');

    const combinedReason = isOutdated 
      ? `[CONFLICT DETECTED] ${reasons.join(' | ')}`
      : 'All checks passed. Record is synchronized with higher instance.';

    return {
      isOutdated,
      strategyUsed: 'hybrid',
      reason: combinedReason,
      timestampDifferenceMs: timeRes.timestampDifferenceMs,
      modCountDifference: modRes.modCountDifference
    };
  }
}
