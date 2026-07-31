/**
 * SN Object Guard - Core Domain Types
 */

export type EnvironmentTier = 'dev' | 'test' | 'uat' | 'prod';

export type AuthType = 'oauth' | 'pat' | 'basic';

export type ComparisonStrategyType = 'sys_updated_on' | 'sys_mod_count' | 'checksum' | 'hybrid';

export interface InstanceConfig {
  name: string;
  hostname: string;
  tier: EnvironmentTier;
  authType: AuthType;
  clientId?: string;
  redirectUri?: string;
  username?: string;
  tokenKey?: string;
}

export interface PipelineConfig {
  chain: string[];
  defaultTier: EnvironmentTier;
  autoDetectHigherInstance: boolean;
}

export interface SNRecordIdentifier {
  instance: string;
  table: string;
  sys_id: string;
  name?: string;
  scriptField?: string;
  localPath?: string;
}

export interface SNRecordData {
  sys_id: string;
  sys_updated_on: string;
  sys_updated_by: string;
  sys_mod_count: number | string;
  name?: string;
  content?: string;
  checksum?: string;
  rawFields: Record<string, any>;
}

export interface FieldDiff {
  field: string;
  localValue: string;
  higherValue: string;
}

export interface ComparisonResult {
  isOutdated: boolean;
  strategyUsed: ComparisonStrategyType;
  reason: string;
  currentInstance: InstanceConfig;
  higherInstance: InstanceConfig;
  currentRecord: SNRecordData;
  higherRecord: SNRecordData;
  fieldDiffs: FieldDiff[];
  timestampDifferenceMs?: number;
  modCountDifference?: number;
}

export interface EmailSettings {
  method: 'mailto' | 'smtp';
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  defaultSubject?: string;
  bodyTemplate?: string;
}

export interface TableConfig {
  table: string;
  scriptField?: string;
  nameField?: string;
  monitored: boolean;
}

export interface GuardConfig {
  enabled: boolean;
  checkOnSave?: boolean;
  checkOnOpen?: boolean;
  instances: Record<string, InstanceConfig>;
  pipeline: PipelineConfig;
  tables: Record<string, TableConfig>;
  comparisonStrategy: ComparisonStrategyType;
  strictness: 'low' | 'medium' | 'high';
  ignoreWhitespace: boolean;
  cacheTTLSeconds: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  email: EmailSettings;
  customHeaders?: {
    instancePattern?: string;
    tablePattern?: string;
    sysIdPattern?: string;
  };
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}
