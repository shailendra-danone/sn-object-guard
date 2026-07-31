import { SNRecordData, InstanceConfig } from '../models/types';

export interface UpdateSetValidationContext {
  record: SNRecordData;
  targetInstance: InstanceConfig;
}

export interface UpdateSetInfo {
  updateSetSysId: string;
  updateSetName: string;
  state: 'in_progress' | 'complete' | 'ignore';
  author: string;
}

export interface UpdateSetValidationResult {
  inOpenUpdateSet: boolean;
  activeUpdateSets: UpdateSetInfo[];
  warnings: string[];
}

export interface IUpdateSetValidatorPlugin {
  id: string;
  name: string;
  validateUpdateSet(context: UpdateSetValidationContext): Promise<UpdateSetValidationResult>;
}
