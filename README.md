# SN Object Guard

> **Enterprise-grade VS Code Extension & Desktop Companion preventing developers from unknowingly overwriting outdated ServiceNow objects.**

[![CI Pipeline](https://github.com/danone/sn-object-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/danone/sn-object-guard/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**SN Object Guard** operates completely outside ServiceNow within your local development environment (VS Code or CLI). It automatically intercepts record files upon open or before save, identifies the lower instance, table, and `sys_id`, and queries the mapped higher instance (`DEV → TEST → UAT → PROD`) via ServiceNow REST APIs. 

If a discrepancy (modified timestamp, modification count, or script checksum) is detected, **SN Object Guard** blocks unsafe overwrites and presents a side-by-side visual diff, direct browser links, and modifier notification capabilities.

---

## 🌟 Key Features

- **Automated Instance & Record Detection**: Reads top-level header comments (`// @instance`, `// @table`, `// @sys_id`), path conventions (`danonedev/sys_script_include/12345.js`), or companion `.sn-meta.json` files.
- **Hierarchical Pipeline Mapping**: Configurable instance chains (`DEV -> TEST -> UAT -> PROD`).
- **Multi-Factor Comparison Engine**:
  - `sys_updated_on`: Timestamp-based update detection.
  - `sys_mod_count`: Sequence modification tracking.
  - `checksum`: SHA-256 script content hash (with optional whitespace normalization).
  - `hybrid`: Comprehensive multi-factor evaluation.
- **Visual Side-by-Side Diff Webview**: Shows precise code diffs, last modifier username, timestamp, and mod count.
- **Instant Actions**:
  - **Open Higher Instance**: Launches browser directly to the higher instance record form.
  - **Email Modifier**: Pre-fills `mailto:` links (Outlook / default OS client) or dispatches via SMTP.
  - **Session Override**: Bypass warnings for current file or session.
- **Secure Authentication & Credential Storage**: Supports OAuth 2.0 PKCE, Personal Access Tokens (PAT), and Basic Credentials stored securely via VS Code `SecretStorage` / OS Keychain.
- **High-Performance In-Memory Caching**: Configurable TTL cache minimizes ServiceNow REST API calls and avoids rate limiting.
- **Desktop Companion CLI**: Run checks outside VS Code in pre-commit hooks, CI scripts, or terminal file watchers.
- **Extensible Architecture**: Built-in plugin interfaces for **3-Way Merge Conflict Resolution**, **Update Set Validation**, and **AI Impact Risk Analysis**.

---

## 🚀 Quick Start

### 1. Install Extension
Download the packaged `.vsix` file or build locally:
```bash
npm install
npm run compile
npm run package
```
In VS Code, press `Ctrl+Shift+P` -> `Extensions: Install from VSIX...` and select `sn-object-guard-1.0.0.vsix`.

### 2. Configure Workspace
Create a `.sn-guard.json` file in your workspace root (or copy `.sn-guard.json.example`):
```json
{
  "instances": {
    "dev": { "name": "dev", "hostname": "danonedev.service-now.com", "tier": "dev", "authType": "oauth" },
    "test": { "name": "test", "hostname": "danonetest.service-now.com", "tier": "test", "authType": "oauth" }
  },
  "pipeline": {
    "chain": ["dev", "test", "uat", "prod"]
  },
  "comparisonStrategy": "hybrid"
}
```

### 3. Store Credentials
Press `Ctrl+Shift+P` -> `SN Object Guard: Configure Instance Credentials` to save your OAuth Bearer Token or Credentials securely.

### 4. Open Any ServiceNow Script
Add header comments to your script file:
```javascript
// @instance danonedev.service-now.com
// @table sys_script_include
// @sys_id c62997741b61ac50285ced7cee4bcbfa
// @name MyScriptInclude

var MyScriptInclude = Class.create();
```
Opening or saving this file will automatically evaluate version parity against the higher instance!

---

## 💻 Desktop Companion CLI

You can also run SN Object Guard directly from the terminal or pre-commit hooks:

```bash
# Check a single file against higher instance
npx sn-object-guard check --file path/to/script.js
```

---

## 🔌 Extensibility Architecture

SN Object Guard is designed with clean plugin interfaces:
- `IMergeConflictPlugin`: Custom 3-way merge resolution algorithm.
- `IUpdateSetValidatorPlugin`: Verification of open update sets on higher instances.
- `IAIImpactAnalysisPlugin`: AI-driven risk scoring and impact assessment.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for full details.

---

## 📄 License
Released under the [MIT License](LICENSE).
