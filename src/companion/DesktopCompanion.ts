import * as fs from 'fs';
import { GuardConfig, ComparisonResult } from '../models/types';
import { ConfigManager } from '../config/ConfigManager';
import { RecordDetector } from '../detector/RecordDetector';
import { ServiceNowClient } from '../api/ServiceNowClient';
import { CredentialManager } from '../auth/CredentialManager';
import { CacheManager } from '../api/CacheManager';
import { ComparisonEngine } from '../comparison/ComparisonEngine';

export class DesktopCompanion {
  private config: GuardConfig;
  private client: ServiceNowClient;
  private cache: CacheManager;
  private creds: CredentialManager;

  constructor(configPath?: string) {
    this.config = ConfigManager.loadConfigFile(configPath);
    this.creds = new CredentialManager();
    this.client = new ServiceNowClient(this.creds);
    this.cache = new CacheManager();
  }

  /**
   * Checks a local file against higher instance
   */
  public async checkFile(filePath: string): Promise<ComparisonResult | null> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const recordId = RecordDetector.detect(filePath, content, this.config);

    if (!recordId) {
      console.log(`[SN Guard Companion] File is not a recognized ServiceNow record: ${filePath}`);
      return null;
    }

    const currentInst = this.config.instances[recordId.instance] || {
      name: recordId.instance,
      hostname: recordId.instance.includes('.') ? recordId.instance : `${recordId.instance}.service-now.com`,
      tier: 'dev',
      authType: 'oauth'
    };

    const higherInst = ConfigManager.getHigherInstance(recordId.instance, this.config);
    if (!higherInst) {
      console.log(`[SN Guard Companion] No higher instance mapped for ${recordId.instance}`);
      return null;
    }

    // Check cache
    let higherRecord = this.cache.get<any>(higherInst.name, recordId.table, recordId.sys_id);
    if (!higherRecord) {
      higherRecord = await this.client.fetchRecord(higherInst, recordId.table, recordId.sys_id, recordId.scriptField);
      this.cache.set(higherInst.name, recordId.table, recordId.sys_id, higherRecord, this.config.cacheTTLSeconds);
    }

    const localRecord = {
      sys_id: recordId.sys_id,
      sys_updated_on: new Date().toISOString().replace('T', ' ').substring(0, 19),
      sys_updated_by: process.env.USERNAME || 'local_dev',
      sys_mod_count: 0,
      name: recordId.name || recordId.sys_id,
      content,
      rawFields: {}
    };

    return ComparisonEngine.compare(
      currentInst,
      higherInst,
      localRecord,
      higherRecord,
      this.config.comparisonStrategy,
      this.config.ignoreWhitespace
    );
  }
}
