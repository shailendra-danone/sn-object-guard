import { SNRecordData, InstanceConfig } from '../models/types';

export interface MergeConflictContext {
  baseRecord?: SNRecordData;
  localRecord: SNRecordData;
  higherRecord: SNRecordData;
  currentInstance: InstanceConfig;
  higherInstance: InstanceConfig;
}

export interface MergeConflictResult {
  hasConflict: boolean;
  conflictLines: Array<{ line: number; localText: string; higherText: string; baseText?: string }>;
  suggestedMerge?: string;
}

export interface IMergeConflictPlugin {
  id: string;
  name: string;
  detectMergeConflicts(context: MergeConflictContext): Promise<MergeConflictResult>;
}
