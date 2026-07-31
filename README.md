# 🛡️ SN Object Guard

> **Enterprise-grade VS Code Extension & Google Chrome Browser Extension preventing ServiceNow developers from unknowingly overwriting outdated objects.**

[![CI Pipeline](https://github.com/shailendra-danone/sn-object-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/shailendra-danone/sn-object-guard/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**SN Object Guard** protects your code across ServiceNow instance pipelines (`DEV → TEST → UAT → PROD`). Whenever a record is opened in Google Chrome or before a file is saved in VS Code, **SN Object Guard** queries the higher environment to ensure no upstream work is lost or overwritten.

---

## 🌐 1. Google Chrome Extension Setup (Layman Guide)

### 📥 Step 1: Download & Extract
1. Download or clone this repository:
   ```bash
   git clone https://github.com/shailendra-danone/sn-object-guard.git
   ```
2. Locate the folder named **`chrome-extension`** inside the downloaded repository.

---

### ⚙️ Step 2: Install in Google Chrome (3 Easy Clicks)

1. Open **Google Chrome** and type `chrome://extensions/` in the address bar (or go to **Menu** `⋮` → **Extensions** → **Manage Extensions**).
2. Enable **Developer mode** by clicking the toggle switch in the **top-right corner**.
   
   ```text
   [ Developer mode  (ON) ]   <--- Click to turn ON
   ```

3. Click the **"Load unpacked"** button in the top-left corner.
   
   ```text
   [ 📁 Load unpacked ]  [ 📦 Pack extension ]  [ 🔄 Update ]
   ```

4. Select the **`chrome-extension`** folder.

---

### 🎯 Step 3: How to Use When a ServiceNow Record is Opened

1. Open your **ServiceNow Instance** in Google Chrome (e.g., `https://danonedev.service-now.com`).
2. Open any record form (such as a **Script Include**, **Business Rule**, **Client Script**, or **Portal Widget**).
3. **SN Object Guard** automatically analyzes the opened record!
   - 🔴 **⚠️ SN GUARD: OUTDATED**: If a higher environment (`TEST`) has a newer version, a floating red warning badge appears at the top-right of your screen showing who modified it and when. Click **"View Diff"** to pop up a side-by-side code diff right inside Chrome!
   - 🟢 **🛡️ SN GUARD: SYNCED**: If your record matches the higher environment, a green badge confirms your code is up to date.

---

## 📦 2. VS Code Extension Setup

### 📥 Install `.vsix` Package
1. Open **VS Code**.
2. Press **`Ctrl + Shift + P`** (or `Cmd + Shift + P` on Mac) to open the Command Palette.
3. Type **`Extensions: Install from VSIX...`** and press Enter.
4. Select `sn-object-guard-1.0.0.vsix`.

---

## 🌟 Key Features

- **Automated Record & Instance Detection**: Extracts table and `sys_id` directly from browser tab URLs or script header comments (`// @instance`, `// @table`, `// @sys_id`).
- **Hierarchical Environment Pipelines**: Maps instance chains (`DEV -> TEST -> UAT -> PROD`).
- **Multi-Factor Comparison Engine**: Evaluates `sys_updated_on` timestamps, `sys_mod_count`, and SHA-256 script content checksums.
- **Visual Side-by-Side Diffing**: Displays code differences, last modifier username, timestamp, and instant action buttons.
- **One-Click Actions**:
  - 🌐 *Open Record in Higher Instance*: Opens the target higher environment record form in browser.
  - ✉️ *Email Modifier*: Pre-fills email to the last modifier asking about their changes.
  - ⚡ *Session Override*: Allows developers to bypass warnings when appropriate.

---

## 📄 License
Released under the [MIT License](LICENSE).
