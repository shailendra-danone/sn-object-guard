import * as vscode from 'vscode';
import { ComparisonResult } from '../models/types';

export class WarningDialog {
  /**
   * Displays a blocking warning dialog with actionable options
   */
  public static async showWarning(result: ComparisonResult): Promise<'open' | 'diff' | 'email' | 'override' | 'cancel'> {
    const higherInstName = result.higherInstance.name.toUpperCase();
    const modifier = result.higherRecord.sys_updated_by;
    const timestamp = result.higherRecord.sys_updated_on;

    const message = `[SN Object Guard] WARNING: Record '${result.currentRecord.name || result.currentRecord.sys_id}' on higher instance (${higherInstName}) was updated by ${modifier} on ${timestamp}. Overwriting could destroy upstream changes!`;

    const choice = await vscode.window.showWarningMessage(
      message,
      { modal: true },
      'Show Diff',
      `Open in ${higherInstName}`,
      `Email ${modifier}`,
      'Continue Anyway'
    );

    switch (choice) {
      case 'Show Diff':
        return 'diff';
      case `Open in ${higherInstName}`:
        return 'open';
      case `Email ${modifier}`:
        return 'email';
      case 'Continue Anyway':
        return 'override';
      default:
        return 'cancel';
    }
  }
}
