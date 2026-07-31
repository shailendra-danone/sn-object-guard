import { 
  SNRecordData, 
  ComparisonResult, 
  InstanceConfig, 
  ComparisonStrategyType, 
  FieldDiff 
} from '../models/types';
import { TimestampStrategy } from './TimestampStrategy';
import { ModCountStrategy } from './ModCountStrategy';
import { ChecksumStrategy } from './ChecksumStrategy';
import { HybridStrategy } from './HybridStrategy';

export class ComparisonEngine {
  /**
   * Evaluates local vs higher record using configured strategy and computes field diffs
   */
  public static compare(
    currentInstance: InstanceConfig,
    higherInstance: InstanceConfig,
    localRecord: SNRecordData,
    higherRecord: SNRecordData,
    strategy: ComparisonStrategyType = 'hybrid',
    ignoreWhitespace: boolean = true
  ): ComparisonResult {
    let resultPartial: Partial<ComparisonResult>;

    switch (strategy) {
      case 'sys_updated_on':
        resultPartial = TimestampStrategy.compare(currentInstance, higherInstance, localRecord, higherRecord);
        break;
      case 'sys_mod_count':
        resultPartial = ModCountStrategy.compare(currentInstance, higherInstance, localRecord, higherRecord);
        break;
      case 'checksum':
        resultPartial = ChecksumStrategy.compare(currentInstance, higherInstance, localRecord, higherRecord, ignoreWhitespace);
        break;
      case 'hybrid':
      default:
        resultPartial = HybridStrategy.compare(currentInstance, higherInstance, localRecord, higherRecord, ignoreWhitespace);
        break;
    }

    const fieldDiffs: FieldDiff[] = [];
    if (localRecord.sys_updated_on !== higherRecord.sys_updated_on) {
      fieldDiffs.push({ field: 'sys_updated_on', localValue: localRecord.sys_updated_on, higherValue: higherRecord.sys_updated_on });
    }
    if (localRecord.sys_updated_by !== higherRecord.sys_updated_by) {
      fieldDiffs.push({ field: 'sys_updated_by', localValue: localRecord.sys_updated_by, higherValue: higherRecord.sys_updated_by });
    }
    if (String(localRecord.sys_mod_count) !== String(higherRecord.sys_mod_count)) {
      fieldDiffs.push({ field: 'sys_mod_count', localValue: String(localRecord.sys_mod_count), higherValue: String(higherRecord.sys_mod_count) });
    }

    return {
      isOutdated: !!resultPartial.isOutdated,
      strategyUsed: strategy,
      reason: resultPartial.reason || 'Comparison completed.',
      currentInstance,
      higherInstance,
      currentRecord: localRecord,
      higherRecord: higherRecord,
      fieldDiffs,
      timestampDifferenceMs: resultPartial.timestampDifferenceMs,
      modCountDifference: resultPartial.modCountDifference
    };
  }
}
