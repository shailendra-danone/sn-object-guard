import * as vscode from 'vscode';
import { ComparisonResult } from '../models/types';

export class DiffWebviewProvider {
  public static currentPanel: vscode.WebviewPanel | undefined;

  public static show(extensionUri: vscode.Uri, result: ComparisonResult, onAction?: (action: string) => void) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DiffWebviewProvider.currentPanel) {
      DiffWebviewProvider.currentPanel.reveal(column);
      DiffWebviewProvider.currentPanel.webview.html = DiffWebviewProvider.getHtmlContent(result);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'snObjectGuardDiff',
      `SN Guard Diff: ${result.currentRecord.name || result.currentRecord.sys_id}`,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    DiffWebviewProvider.currentPanel = panel;
    panel.webview.html = DiffWebviewProvider.getHtmlContent(result);

    panel.webview.onDidReceiveMessage(
      (message: any) => {
        if (onAction) {
          onAction(message.command);
        }
      },
      null,
      []
    );

    panel.onDidDispose(() => {
      DiffWebviewProvider.currentPanel = undefined;
    });
  }

  private static getHtmlContent(result: ComparisonResult): string {
    const recordName = result.currentRecord.name || result.currentRecord.sys_id;
    const higherInstName = result.higherInstance.name.toUpperCase();
    const modifier = result.higherRecord.sys_updated_by;
    const timestamp = result.higherRecord.sys_updated_on;
    const modCount = result.higherRecord.sys_mod_count;
    const localContent = result.currentRecord.content || '(empty)';
    const higherContent = result.higherRecord.content || '(empty)';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SN Guard Diff Analysis</title>
  <style>
    body {
      font-family: var(--vscode-font-family, system-ui, -apple-system, sans-serif);
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
      padding: 24px;
      margin: 0;
    }
    .banner {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .banner h2 {
      margin-top: 0;
      color: #ef4444;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.4rem;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 16px;
      background: rgba(0,0,0,0.15);
      padding: 14px;
      border-radius: 6px;
    }
    .meta-item label {
      font-size: 0.75rem;
      text-transform: uppercase;
      opacity: 0.7;
      display: block;
      margin-bottom: 4px;
    }
    .meta-item value {
      font-weight: 600;
      font-size: 0.95rem;
    }
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 10px 18px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
      transform: translateY(-1px);
    }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .diff-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 24px;
    }
    .code-box {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border, rgba(255,255,255,0.1));
      border-radius: 6px;
      overflow: hidden;
    }
    .code-header {
      background: rgba(255,255,255,0.05);
      padding: 10px 16px;
      font-weight: 600;
      font-size: 0.85rem;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(255,255,255,0.1));
      display: flex;
      justify-content: space-between;
    }
    pre {
      margin: 0;
      padding: 16px;
      overflow-x: auto;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-editor-font-size, 13px);
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="banner">
    <h2>⚠️ Higher Instance Modification Detected</h2>
    <p style="margin: 4px 0 0 0; opacity: 0.9;">
      The record <strong>${escapeHtml(recordName)}</strong> on higher instance <strong>${escapeHtml(higherInstName)}</strong> has modifications that do not match your current version.
    </p>
    
    <div class="meta-grid">
      <div class="meta-item">
        <label>Higher Instance</label>
        <value>${escapeHtml(higherInstName)} (${escapeHtml(result.higherInstance.hostname)})</value>
      </div>
      <div class="meta-item">
        <label>Last Modifier</label>
        <value>${escapeHtml(modifier)}</value>
      </div>
      <div class="meta-item">
        <label>Last Updated On</label>
        <value>${escapeHtml(timestamp)}</value>
      </div>
      <div class="meta-item">
        <label>Mod Count (Higher vs Local)</label>
        <value>${escapeHtml(String(modCount))} vs ${escapeHtml(String(result.currentRecord.sys_mod_count))}</value>
      </div>
    </div>

    <div class="actions">
      <button onclick="post('openBrowser')">🌐 Open Record in ${escapeHtml(higherInstName)}</button>
      <button class="secondary" onclick="post('sendEmail')">✉️ Email Modifier (${escapeHtml(modifier)})</button>
      <button class="secondary" onclick="post('override')">⚡ Override & Continue</button>
    </div>
  </div>

  <h3>Side-by-Side Code Preview</h3>
  <div class="diff-container">
    <div class="code-box">
      <div class="code-header">
        <span>Current / Local Code</span>
        <span>${escapeHtml(result.currentRecord.sys_updated_on)}</span>
      </div>
      <pre><code>${escapeHtml(localContent)}</code></pre>
    </div>

    <div class="code-box">
      <div class="code-header">
        <span>Higher Instance Code (${escapeHtml(higherInstName)})</span>
        <span>${escapeHtml(timestamp)} by ${escapeHtml(modifier)}</span>
      </div>
      <pre><code>${escapeHtml(higherContent)}</code></pre>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function post(command) {
      vscode.postMessage({ command });
    }
  </script>
</body>
</html>`;
  }
}

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
