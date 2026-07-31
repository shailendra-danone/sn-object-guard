import * as vscode from 'vscode';
import { ComparisonResult, EmailSettings } from '../models/types';
import * as nodemailer from 'nodemailer';

export class EmailService {
  /**
   * Generates mailto URL or sends direct SMTP email
   */
  public static async sendOrOpenEmail(result: ComparisonResult, settings: EmailSettings): Promise<void> {
    const modifier = result.higherRecord.sys_updated_by;
    const recordName = result.currentRecord.name || result.currentRecord.sys_id;
    const sysId = result.currentRecord.sys_id;
    const table = result.currentRecord.rawFields?.sys_class_name || 'ServiceNow Record';
    const lowerInstance = result.currentInstance.hostname;
    const higherInstance = result.higherInstance.hostname;
    const sysUpdatedOn = result.higherRecord.sys_updated_on;

    // Substitute template placeholders
    let subject = settings.defaultSubject || '[SN Object Guard Alert] Conflict detected for ServiceNow record {{recordName}}';
    subject = subject
      .replace(/{{recordName}}/g, recordName)
      .replace(/{{sysId}}/g, sysId)
      .replace(/{{table}}/g, table);

    let body = settings.bodyTemplate || `Hello {{modifier}},\n\nA potential conflict was detected for ServiceNow record '{{recordName}}' (Table: {{table}}, Sys ID: {{sysId}}).\n\nLower Instance: {{lowerInstance}}\nHigher Instance: {{higherInstance}}\nLast Modified On Higher Instance: {{sysUpdatedOn}}\nLast Modified By: {{modifier}}\n\nPlease review before overwriting higher environment code.\n\nRegards,\nSN Object Guard`;
    body = body
      .replace(/{{modifier}}/g, modifier)
      .replace(/{{recordName}}/g, recordName)
      .replace(/{{table}}/g, table)
      .replace(/{{sysId}}/g, sysId)
      .replace(/{{lowerInstance}}/g, lowerInstance)
      .replace(/{{higherInstance}}/g, higherInstance)
      .replace(/{{sysUpdatedOn}}/g, sysUpdatedOn);

    const recipientEmail = modifier.includes('@') ? modifier : `${modifier}@danone.com`;

    if (settings.method === 'smtp' && settings.smtpHost) {
      try {
        const transporter = nodemailer.createTransport({
          host: settings.smtpHost,
          port: settings.smtpPort || 587,
          secure: !!settings.smtpSecure,
          auth: settings.smtpUser ? { user: settings.smtpUser, pass: settings.smtpPass } : undefined
        });

        await transporter.sendMail({
          from: settings.smtpUser || 'sn-object-guard@danone.com',
          to: recipientEmail,
          subject,
          text: body
        });

        vscode.window.showInformationMessage(`[SN Object Guard] Email sent to ${recipientEmail} via SMTP.`);
        return;
      } catch (error: any) {
        vscode.window.showErrorMessage(`[SN Object Guard] SMTP error: ${error.message}. Falling back to mailto: link.`);
      }
    }

    // Default: Mailto URI
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    await vscode.env.openExternal(vscode.Uri.parse(mailtoUrl));
  }
}
