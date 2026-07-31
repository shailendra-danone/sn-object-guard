import * as vscode from 'vscode';
import { ComparisonResult } from '../models/types';

export class StatusBarItemManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'snObjectGuard.checkCurrentFile';
    this.setIdle();
    this.statusBarItem.show();
  }

  public setIdle(): void {
    this.statusBarItem.text = `$(shield) SN Guard: Ready`;
    this.statusBarItem.tooltip = 'SN Object Guard is active. Click to check current file.';
    this.statusBarItem.backgroundColor = undefined;
  }

  public setChecking(): void {
    this.statusBarItem.text = `$(sync~spin) SN Guard: Checking...`;
    this.statusBarItem.tooltip = 'Comparing local object with higher instance...';
  }

  public setOutdated(result: ComparisonResult): void {
    this.statusBarItem.text = `$(warning) SN Guard: OUTDATED (${result.higherInstance.name.toUpperCase()})`;
    this.statusBarItem.tooltip = `WARNING: Record on ${result.higherInstance.name} was modified by ${result.higherRecord.sys_updated_by} on ${result.higherRecord.sys_updated_on}. Click to view diff.`;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    this.statusBarItem.command = 'snObjectGuard.showDiff';
  }

  public setSynchronized(instanceName: string): void {
    this.statusBarItem.text = `$(check) SN Guard: Synced (${instanceName.toUpperCase()})`;
    this.statusBarItem.tooltip = `Record is up to date with higher instance (${instanceName}).`;
    this.statusBarItem.backgroundColor = undefined;
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
