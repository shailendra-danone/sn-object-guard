import { InstanceConfig, SNRecordData } from '../models/types';
import { CredentialManager, Credentials } from '../auth/CredentialManager';

export class ServiceNowClient {
  private credManager: CredentialManager;

  constructor(credManager: CredentialManager) {
    this.credManager = credManager;
  }

  /**
   * Helper function for retrying async operations with exponential backoff & jitter
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 500
  ): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await fn();
      } catch (error: any) {
        attempt++;
        if (attempt >= maxRetries) {
          throw error;
        }
        // Don't retry on 401/403/404
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
          throw error;
        }
        const jitter = Math.random() * 200;
        const delay = initialDelayMs * Math.pow(2, attempt - 1) + jitter;
        await new Promise(res => setTimeout(res, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Fetches a ServiceNow record from Table API
   */
  public async fetchRecord(
    instance: InstanceConfig,
    table: string,
    sys_id: string,
    scriptField: string = 'script'
  ): Promise<SNRecordData> {
    return this.retryWithBackoff(async () => {
      const creds = await this.credManager.getCredentials(instance.name) || 
                    await this.credManager.getCredentials(instance.hostname);

      const hostname = instance.hostname.includes('.') 
        ? instance.hostname 
        : `${instance.hostname}.service-now.com`;

      const fields = ['sys_id', 'sys_updated_on', 'sys_updated_by', 'sys_mod_count', 'name', scriptField].join(',');
      const url = `https://${hostname}/api/now/table/${table}/${sys_id}?sysparm_fields=${fields}&sysparm_display_value=false`;

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'SN-Object-Guard/1.0.0'
      };

      if (creds) {
        if (creds.authType === 'basic' && creds.username && creds.password) {
          const authString = Buffer.from(`${creds.username}:${creds.password}`).toString('base64');
          headers['Authorization'] = `Basic ${authString}`;
        } else if (creds.token) {
          headers['Authorization'] = `Bearer ${creds.token}`;
        }
      }

      const response = await fetch(url, { method: 'GET', headers });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const err: any = new Error(`ServiceNow API HTTP ${response.status} (${response.statusText}): ${errorText}`);
        err.status = response.status;
        throw err;
      }

      const json: any = await response.json();
      const result = json.result || json;

      if (!result || !result.sys_id) {
        throw new Error(`Record ${sys_id} not found in table ${table} on instance ${instance.name}`);
      }

      const scriptContent = result[scriptField] || result['script'] || result['content'] || '';

      return {
        sys_id: result.sys_id,
        sys_updated_on: result.sys_updated_on || '',
        sys_updated_by: result.sys_updated_by || 'unknown',
        sys_mod_count: parseInt(result.sys_mod_count || '0', 10),
        name: result.name || result.short_description || result.sys_id,
        content: scriptContent,
        rawFields: result
      };
    });
  }
}
