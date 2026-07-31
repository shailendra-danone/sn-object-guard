import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigManager } from './config/ConfigManager';
import { RecordDetector } from './detector/RecordDetector';
import { CredentialManager } from './auth/CredentialManager';
import { ServiceNowClient } from './api/ServiceNowClient';
import { CacheManager } from './api/CacheManager';
import { ComparisonEngine } from './comparison/ComparisonEngine';
import { OutputLogger } from './ui/OutputLogger';
import { StatusBarItemManager } from './ui/StatusBarItem';
import { DiffWebviewProvider } from './ui/DiffWebviewProvider';
import { WarningDialog } from './ui/WarningDialog';
import { EmailService } from './email/EmailService';
import { ComparisonResult, GuardConfig } from './models/types';
import { DesktopCompanion } from './companion/DesktopCompanion';

export function activate(context: vscode.ExtensionContext) {
  const logger = OutputLogger.getInstance();
  logger.info('Activating SN Object Guard VS Code Extension...');

  const credManager = new CredentialManager(context.secrets);
  const snClient = new ServiceNowClient(credManager);
  const cacheManager = new CacheManager();
  const statusBar = new StatusBarItemManager();
  const sessionOverrides = new Set<string>();

  let lastComparisonResult: ComparisonResult | undefined;

  /**
   * Helper to load current merged config
   */
  function getConfig(): GuardConfig {
    const vsConfig = vscode.workspace.getConfiguration('snObjectGuard');
    const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const configFileName = vsConfig.get<string>('configFile') || '.sn-guard.json';
    const configPath = wsFolder ? path.join(wsFolder, configFileName) : undefined;

    const baseConfig = ConfigManager.loadConfigFile(configPath);
    return ConfigManager.mergeConfig(baseConfig, {
      enabled: vsConfig.get<boolean>('enabled', true),
      checkOnSave: vsConfig.get<boolean>('checkOnSave', true),
      checkOnOpen: vsConfig.get<boolean>('checkOnOpen', true),
      comparisonStrategy: vsConfig.get<any>('comparisonStrategy', 'hybrid'),
      cacheTTLSeconds: vsConfig.get<number>('cacheTTLSeconds', 300),
      logLevel: vsConfig.get<any>('logLevel', 'info')
    });
  }

  /**
   * Evaluates active document against mapped higher instance
   */
  async function performCheck(document: vscode.TextDocument): Promise<ComparisonResult | null> {
    const config = getConfig();
    if (!config.enabled) {
      logger.debug('SN Object Guard is disabled in settings.');
      return null;
    }

    const filePath = document.fileName;
    const content = document.getText();

    const recordId = RecordDetector.detect(filePath, content, config);
    if (!recordId) {
      logger.debug(`File ${filePath} is not a recognized ServiceNow record.`);
      statusBar.setIdle();
      return null;
    }

    logger.info(`Detected ServiceNow record: Table=${recordId.table}, SysId=${recordId.sys_id}, Instance=${recordId.instance}`);
    statusBar.setChecking();

    const currentInst = config.instances[recordId.instance] || {
      name: recordId.instance,
      hostname: recordId.instance.includes('.') ? recordId.instance : `${recordId.instance}.service-now.com`,
      tier: 'dev',
      authType: 'oauth'
    };

    const higherInst = ConfigManager.getHigherInstance(recordId.instance, config);
    if (!higherInst) {
      logger.warn(`No higher instance mapped for current instance: ${recordId.instance}`);
      statusBar.setSynchronized(currentInst.name);
      return null;
    }

    try {
      // Fetch higher record metadata (with cache)
      let higherRecord = cacheManager.get<any>(higherInst.name, recordId.table, recordId.sys_id);
      if (!higherRecord) {
        logger.info(`Fetching record ${recordId.sys_id} from higher instance ${higherInst.name} (${higherInst.hostname})...`);
        higherRecord = await snClient.fetchRecord(higherInst, recordId.table, recordId.sys_id, recordId.scriptField);
        cacheManager.set(higherInst.name, recordId.table, recordId.sys_id, higherRecord, config.cacheTTLSeconds);
      }

      const localRecord = {
        sys_id: recordId.sys_id,
        sys_updated_on: new Date().toISOString().replace('T', ' ').substring(0, 19),
        sys_updated_by: process.env.USERNAME || 'local_developer',
        sys_mod_count: 0,
        name: recordId.name || recordId.sys_id,
        content,
        rawFields: {}
      };

      const result = ComparisonEngine.compare(
        currentInst,
        higherInst,
        localRecord,
        higherRecord,
        config.comparisonStrategy,
        config.ignoreWhitespace
      );

      lastComparisonResult = result;

      if (result.isOutdated) {
        logger.warn(`OUTDATED RECORD DETECTED! ${result.reason}`);
        statusBar.setOutdated(result);
      } else {
        logger.info(`Record is synchronized with ${higherInst.name}`);
        statusBar.setSynchronized(higherInst.name);
      }

      return result;
    } catch (err: any) {
      logger.error(`Failed to check record against higher instance: ${err.message}`);
      statusBar.setIdle();
      return null;
    }
  }

  // --- Event Listeners ---

  // 1. On Will Save Document
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument((event: vscode.TextDocumentWillSaveEvent) => {
      const config = getConfig();
      if (!config.enabled || !config.checkOnSave) return;

      const doc = event.document;
      const fileUri = doc.uri.toString();

      if (sessionOverrides.has(fileUri)) {
        logger.info(`Save allowed: session override active for ${fileUri}`);
        return;
      }

      event.waitUntil(
        (async () => {
          const result = await performCheck(doc);
          if (result && result.isOutdated) {
            const action = await WarningDialog.showWarning(result);
            if (action === 'diff') {
              DiffWebviewProvider.show(context.extensionUri, result, async act => {
                if (act === 'sendEmail') {
                  await EmailService.sendOrOpenEmail(result, config.email);
                } else if (act === 'override') {
                  sessionOverrides.add(fileUri);
                  vscode.window.showInformationMessage(`[SN Guard] Warning overridden for ${path.basename(doc.fileName)}.`);
                } else if (act === 'openBrowser') {
                  vscode.commands.executeCommand('snObjectGuard.openHigherInstance');
                }
              });
              throw new Error('Save cancelled by SN Object Guard due to higher instance conflict.');
            } else if (action === 'open') {
              vscode.commands.executeCommand('snObjectGuard.openHigherInstance');
              throw new Error('Save cancelled to review higher instance record.');
            } else if (action === 'email') {
              await EmailService.sendOrOpenEmail(result, config.email);
              throw new Error('Save paused for emailing modifier.');
            } else if (action === 'override') {
              sessionOverrides.add(fileUri);
              vscode.window.showInformationMessage(`[SN Guard] Warning overridden for ${path.basename(doc.fileName)}.`);
            } else {
              throw new Error('Save cancelled by user.');
            }
          }
        })()
      );
    })
  );

  // 2. On Change Active Text Editor
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined) => {
      if (editor?.document) {
        const config = getConfig();
        if (config.enabled && config.checkOnOpen) {
          performCheck(editor.document);
        }
      }
    })
  );

  // --- Commands ---

  context.subscriptions.push(
    vscode.commands.registerCommand('snObjectGuard.checkCurrentFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor found.');
        return;
      }
      const res = await performCheck(editor.document);
      if (res && res.isOutdated) {
        DiffWebviewProvider.show(context.extensionUri, res);
      } else if (res) {
        vscode.window.showInformationMessage(`[SN Guard] Record is up to date with ${res.higherInstance.name}.`);
      } else {
        vscode.window.showInformationMessage('[SN Guard] File is not a recognized ServiceNow record or no higher instance mapped.');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('snObjectGuard.showDiff', () => {
      if (!lastComparisonResult) {
        vscode.window.showWarningMessage('No comparison result available yet. Run a check first.');
        return;
      }
      DiffWebviewProvider.show(context.extensionUri, lastComparisonResult);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('snObjectGuard.configureCredentials', async () => {
      const config = getConfig();
      const instanceNames = Object.keys(config.instances);
      const selectedInst = await vscode.window.showQuickPick(instanceNames, {
        placeHolder: 'Select ServiceNow instance to configure credentials for'
      });

      if (!selectedInst) return;

      const authType = await vscode.window.showQuickPick(['oauth', 'pat', 'basic'], {
        placeHolder: 'Select Authentication Method'
      }) as 'oauth' | 'pat' | 'basic' | undefined;

      if (!authType) return;

      if (authType === 'basic') {
        const username = await vscode.window.showInputBox({ prompt: 'Enter ServiceNow Username' });
        const password = await vscode.window.showInputBox({ prompt: 'Enter ServiceNow Password', password: true });
        if (username && password) {
          await credManager.setCredentials(selectedInst, { authType: 'basic', username, password });
          vscode.window.showInformationMessage(`Credentials saved for ${selectedInst}.`);
        }
      } else {
        const token = await vscode.window.showInputBox({ prompt: `Enter Bearer Token / Personal Access Token for ${selectedInst}`, password: true });
        if (token) {
          await credManager.setCredentials(selectedInst, { authType, token });
          vscode.window.showInformationMessage(`Token saved for ${selectedInst}.`);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('snObjectGuard.clearCache', () => {
      cacheManager.clear();
      vscode.window.showInformationMessage('[SN Object Guard] Metadata cache cleared successfully.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('snObjectGuard.emailLastModifier', async () => {
      if (!lastComparisonResult) {
        vscode.window.showWarningMessage('No active conflict comparison available.');
        return;
      }
      const config = getConfig();
      await EmailService.sendOrOpenEmail(lastComparisonResult, config.email);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('snObjectGuard.openHigherInstance', async () => {
      if (!lastComparisonResult) {
        vscode.window.showWarningMessage('No comparison result available.');
        return;
      }
      const higherHost = lastComparisonResult.higherInstance.hostname;
      const table = lastComparisonResult.currentRecord.rawFields?.sys_class_name || 'sys_script_include';
      const sysId = lastComparisonResult.currentRecord.sys_id;
      const url = `https://${higherHost}/nav_to.do?uri=${table}.do?sys_id=${sysId}`;
      await vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('snObjectGuard.overrideWarning', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        sessionOverrides.add(editor.document.uri.toString());
        vscode.window.showInformationMessage(`[SN Guard] Warning overridden for ${path.basename(editor.document.fileName)}.`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('snObjectGuard.startDesktopCompanion', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor open.');
        return;
      }
      const companion = new DesktopCompanion();
      const res = await companion.checkFile(editor.document.fileName);
      if (res?.isOutdated) {
        vscode.window.showErrorMessage(`[Companion CLI] Outdated! ${res.reason}`);
      } else {
        vscode.window.showInformationMessage('[Companion CLI] Record is up to date.');
      }
    })
  );

  context.subscriptions.push(statusBar);
  logger.info('SN Object Guard VS Code Extension activated successfully.');
}

export function deactivate() {
  OutputLogger.getInstance().info('Deactivating SN Object Guard VS Code Extension.');
}
