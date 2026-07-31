import * as vscode from 'vscode';

export interface Credentials {
  authType: 'oauth' | 'pat' | 'basic';
  token?: string;
  username?: string;
  password?: string;
}

export class CredentialManager {
  private secretStorage?: vscode.SecretStorage;
  private inMemoryFallback: Map<string, string> = new Map();

  constructor(secretStorage?: vscode.SecretStorage) {
    this.secretStorage = secretStorage;
  }

  /**
   * Generates key format: `sn_guard_auth_${instanceName}`
   */
  private getKey(instanceName: string): string {
    return `sn_guard_auth_${instanceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  /**
   * Stores credentials securely
   */
  public async setCredentials(instanceName: string, credentials: Credentials): Promise<void> {
    const serialized = JSON.stringify(credentials);
    const key = this.getKey(instanceName);

    if (this.secretStorage) {
      await this.secretStorage.store(key, serialized);
    } else {
      this.inMemoryFallback.set(key, serialized);
    }
  }

  /**
   * Retrieves credentials for an instance
   */
  public async getCredentials(instanceName: string): Promise<Credentials | null> {
    const key = this.getKey(instanceName);
    let serialized: string | undefined;

    if (this.secretStorage) {
      serialized = await this.secretStorage.get(key);
    } else {
      serialized = this.inMemoryFallback.get(key);
    }

    // Check environment variable fallback (e.g. SN_TOKEN_DEV or SN_AUTH_DEV)
    if (!serialized) {
      const envKey = `SN_AUTH_${instanceName.toUpperCase()}`;
      const envVal = process.env[envKey];
      if (envVal) {
        try {
          return JSON.parse(envVal);
        } catch {
          return { authType: 'pat', token: envVal };
        }
      }
      return null;
    }

    try {
      return JSON.parse(serialized);
    } catch {
      return null;
    }
  }

  /**
   * Removes credentials for an instance
   */
  public async deleteCredentials(instanceName: string): Promise<void> {
    const key = this.getKey(instanceName);
    if (this.secretStorage) {
      await this.secretStorage.delete(key);
    } else {
      this.inMemoryFallback.delete(key);
    }
  }
}
