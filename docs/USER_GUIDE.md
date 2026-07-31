# SN Object Guard - User & Configuration Guide

Welcome to **SN Object Guard**! This guide details configuration parameters, usage scenarios, and integration recipes.

---

## ⚙ Configuration Reference (`.sn-guard.json`)

Place `.sn-guard.json` in your workspace root to customize behavior across your team.

```json
{
  "$schema": "./.sn-guard.schema.json",
  "enabled": true,
  "instances": {
    "dev": {
      "name": "dev",
      "hostname": "danonedev.service-now.com",
      "tier": "dev",
      "authType": "oauth"
    },
    "test": {
      "name": "test",
      "hostname": "danonetest.service-now.com",
      "tier": "test",
      "authType": "oauth"
    },
    "uat": {
      "name": "uat",
      "hostname": "danoneuat.service-now.com",
      "tier": "uat",
      "authType": "oauth"
    },
    "prod": {
      "name": "prod",
      "hostname": "danoneprod.service-now.com",
      "tier": "prod",
      "authType": "oauth"
    }
  },
  "pipeline": {
    "chain": ["dev", "test", "uat", "prod"],
    "defaultTier": "dev"
  },
  "comparisonStrategy": "hybrid",
  "ignoreWhitespace": true,
  "cacheTTLSeconds": 300,
  "logLevel": "info",
  "email": {
    "method": "mailto",
    "defaultSubject": "[SN Object Guard] Conflict in {{recordName}}",
    "bodyTemplate": "Hello {{modifier}},\n\nA conflict was detected for {{recordName}} on {{higherInstance}}.\n\nRegards,\nSN Guard"
  }
}
```

---

## 🔍 Supported Record Header Formats

You can add header annotations at the top of your scripts:

### JavaScript / TypeScript
```javascript
// @instance danonedev.service-now.com
// @table sys_script_include
// @sys_id c62997741b61ac50285ced7cee4bcbfa
// @name MyScriptInclude
```

### XML / HTML
```xml
<!-- @instance danonedev.service-now.com -->
<!-- @table sp_widget -->
<!-- @sys_id 1234567890abcdef1234567890abcdef -->
```

---

## 🛠 Commands Reference

- `SN Object Guard: Check Current File`: Manually evaluate current file against higher instance.
- `SN Object Guard: Show Side-by-Side Diff`: Open Webview diff panel.
- `SN Object Guard: Configure Credentials`: Save OAuth/PAT credentials securely in OS Keychain.
- `SN Object Guard: Clear Metadata Cache`: Force clear local TTL cache.
- `SN Object Guard: Email Last Modifier`: Dispatch alert email to last modifier.
- `SN Object Guard: Open Higher Instance Record`: Open higher instance form in browser.
- `SN Object Guard: Override Outdated Warning`: Bypass check for current file/session.
