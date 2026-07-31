import { SNRecordData, ComparisonResult, InstanceConfig } from '../models/types';

export class TimestampStrategy {
  /**
   * Compares lower record and higher record by sys_updated_on timestamp
   */
  public static compare(
    currentInstance: InstanceConfig,
    higherInstance: InstanceConfig,
    localRecord: SNRecordData,
    higherRecord: SNRecordData
  ): Partial<ComparisonResult> {
    const localTime = new Date(localRecord.sys_updated_on).getTime();
    const higherTime = new Date(higherRecord.sys_updated_on).getTime();

    const diffMs = higherTime - localTime;
    const isOutdated = higherTime > localTime;

    let reason = 'Record timestamps match or lower instance is up to date.';
    if (isNaN(localTime) || isNaN(higherTime)) {
      reason = 'Timestamp parsing error. Unable to verify exact update time.';
    } else if (isOutdated) {
      reason = `Higher instance (${higherInstance.name}) has a newer update on ${higherRecord.sys_updated_on} by ${higherRecord.sys_updated_by}.`;
    }

    return {
      isOutdated,
      strategyUsed: 'sys_updated_on',
      reason,
      timestampDifferenceMs: diffMs
    };
  }
}
