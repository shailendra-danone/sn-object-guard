import { SNRecordData, ComparisonResult, InstanceConfig } from '../models/types';

export class ModCountStrategy {
  /**
   * Compares lower record and higher record by numeric sys_mod_count
   */
  public static compare(
    currentInstance: InstanceConfig,
    higherInstance: InstanceConfig,
    localRecord: SNRecordData,
    higherRecord: SNRecordData
  ): Partial<ComparisonResult> {
    const localMod = typeof localRecord.sys_mod_count === 'number' 
      ? localRecord.sys_mod_count 
      : parseInt(localRecord.sys_mod_count || '0', 10);
    const higherMod = typeof higherRecord.sys_mod_count === 'number' 
      ? higherRecord.sys_mod_count 
      : parseInt(higherRecord.sys_mod_count || '0', 10);

    const modDiff = higherMod - localMod;
    const isOutdated = higherMod > localMod;

    let reason = 'Record mod counts match or lower instance has equal/higher mod count.';
    if (isOutdated) {
      reason = `Higher instance (${higherInstance.name}) has higher modification count (${higherMod} vs ${localMod}). Last modifier: ${higherRecord.sys_updated_by}.`;
    }

    return {
      isOutdated,
      strategyUsed: 'sys_mod_count',
      reason,
      modCountDifference: modDiff
    };
  }
}
