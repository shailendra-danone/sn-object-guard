import * as fs from 'fs';
import * as path from 'path';
import { GuardConfig, InstanceConfig, TableConfig, PipelineConfig } from '../models/types';

export class ConfigManager {
  private static defaultTables: Record<string, TableConfig> = {
    sys_script_include: { table: 'sys_script_include', scriptField: 'script', nameField: 'name', monitored: true },
    sys_ui_script: { table: 'sys_ui_script', scriptField: 'script', nameField: 'name', monitored: true },
    sys_script: { table: 'sys_script', scriptField: 'script', nameField: 'name', monitored: true },
    sys_ui_policy: { table: 'sys_ui_policy', scriptField: 'script_true', nameField: 'short_description', monitored: true },
    sys_client_script: { table: 'sys_client_script', scriptField: 'script', nameField: 'name', monitored: true },
    sp_widget: { table: 'sp_widget', scriptField: 'script', nameField: 'name', monitored: true },
    sys_widgets: { table: 'sys_widgets', scriptField: 'script', nameField: 'name', monitored: true },
    sys_ws_definition: { table: 'sys_ws_definition', scriptField: 'doc_template', nameField: 'name', monitored: true },
    sys_transform_script: { table: 'sys_transform_script', scriptField: 'script', nameField: 'name', monitored: true },
    sys_dictionary: { table: 'sys_dictionary', scriptField: 'calculation', nameField: 'element', monitored: true }
  };

  private static defaultConfig: GuardConfig = {
    enabled: true,
    checkOnSave: true,
    checkOnOpen: true,
    instances: {
      dev: {
        name: 'dev',
        hostname: 'danonedev.service-now.com',
        tier: 'dev',
        authType: 'oauth'
      },
      test: {
        name: 'test',
        hostname: 'danonetest.service-now.com',
        tier: 'test',
        authType: 'oauth'
      },
      uat: {
        name: 'uat',
        hostname: 'danoneuat.service-now.com',
        tier: 'uat',
        authType: 'oauth'
      },
      prod: {
        name: 'prod',
        hostname: 'danoneprod.service-now.com',
        tier: 'prod',
        authType: 'oauth'
      }
    },
    pipeline: {
      chain: ['dev', 'test', 'uat', 'prod'],
      defaultTier: 'dev',
      autoDetectHigherInstance: true
    },
    tables: ConfigManager.defaultTables,
    comparisonStrategy: 'hybrid',
    strictness: 'high',
    ignoreWhitespace: true,
    cacheTTLSeconds: 300,
    logLevel: 'info',
    email: {
      method: 'mailto',
      defaultSubject: '[SN Object Guard Alert] Conflict detected for ServiceNow record {{recordName}}',
      bodyTemplate: `Hello {{modifier}},\n\nA potential conflict was detected for ServiceNow record '{{recordName}}' (Table: {{table}}, Sys ID: {{sysId}}).\n\nLower Instance: {{lowerInstance}}\nHigher Instance: {{higherInstance}}\nLast Modified On Higher Instance: {{sysUpdatedOn}}\nLast Modified By: {{modifier}}\n\nPlease review before overwriting higher environment code.\n\nRegards,\nSN Object Guard`
    }
  };

  /**
   * Load configuration from file path or fallback to default
   */
  public static loadConfigFile(filePath?: string): GuardConfig {
    if (!filePath || !fs.existsSync(filePath)) {
      return ConfigManager.defaultConfig;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      return ConfigManager.mergeConfig(ConfigManager.defaultConfig, parsed);
    } catch (error) {
      console.error(`Failed to parse config file at ${filePath}:`, error);
      return ConfigManager.defaultConfig;
    }
  }

  /**
   * Deep merge custom user configuration into base default config
   */
  public static mergeConfig(base: GuardConfig, custom: Partial<GuardConfig>): GuardConfig {
    return {
      ...base,
      ...custom,
      instances: {
        ...base.instances,
        ...(custom.instances || {})
      },
      pipeline: {
        ...base.pipeline,
        ...(custom.pipeline || {})
      },
      tables: {
        ...base.tables,
        ...(custom.tables || {})
      },
      email: {
        ...base.email,
        ...(custom.email || {})
      }
    };
  }

  /**
   * Get the mapped higher instance for a given instance or tier
   */
  public static getHigherInstance(currentInstanceNameOrHost: string, config: GuardConfig): InstanceConfig | null {
    const instances = Object.values(config.instances);
    
    // Find current instance by name or hostname
    const current = instances.find(
      inst => inst.name.toLowerCase() === currentInstanceNameOrHost.toLowerCase() ||
              inst.hostname.toLowerCase() === currentInstanceNameOrHost.toLowerCase() ||
              currentInstanceNameOrHost.toLowerCase().includes(inst.name.toLowerCase())
    );

    if (!current) {
      return null;
    }

    const chain = config.pipeline.chain;
    const currentIndex = chain.findIndex(t => t.toLowerCase() === current.tier.toLowerCase() || t.toLowerCase() === current.name.toLowerCase());

    if (currentIndex === -1 || currentIndex >= chain.length - 1) {
      return null; // Highest tier reached or not in pipeline
    }

    const higherTierOrName = chain[currentIndex + 1];
    return instances.find(inst => inst.tier.toLowerCase() === higherTierOrName.toLowerCase() || inst.name.toLowerCase() === higherTierOrName.toLowerCase()) || null;
  }
}
