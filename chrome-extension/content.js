// SN Object Guard Chrome Extension - Content Script

(function () {
  let floatingBadge = null;

  /**
   * Extract table and sys_id from URL or DOM
   */
  function detectServiceNowRecord() {
    const href = window.location.href;
    const searchParams = new URLSearchParams(window.location.search);

    // 1. Direct form URL: sys_script_include.do?sys_id=12345...
    const directMatch = href.match(/\/([a-zA-Z0-9_]+)\.do\?.*sys_id=([a-fA-F0-9]{32})/);
    if (directMatch) {
      return { table: directMatch[1], sysId: directMatch[2] };
    }

    // 2. Query parameters: uri=sys_script_include.do?sys_id=12345...
    const uriParam = searchParams.get('uri');
    if (uriParam) {
      const uriMatch = uriParam.match(/\/([a-zA-Z0-9_]+)\.do\?.*sys_id=([a-fA-F0-9]{32})/);
      if (uriMatch) {
        return { table: uriMatch[1], sysId: uriMatch[2] };
      }
    }

    // 3. Try DOM g_form if available
    try {
      if (window.g_form) {
        const table = window.g_form.getTableName();
        const sysId = window.g_form.getUniqueValue();
        if (table && sysId && sysId !== '-1') {
          return { table, sysId };
        }
      }
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Render Floating Guard Badge
   */
  function renderBadge(result) {
    if (floatingBadge) floatingBadge.remove();

    floatingBadge = document.createElement('div');
    floatingBadge.id = 'sn-guard-floating-badge';

    if (result.isAuthError) {
      floatingBadge.className = 'sn-guard-badge outdated';
      floatingBadge.innerHTML = `
        <div class="sn-guard-badge-icon">🔑</div>
        <div class="sn-guard-badge-text">
          <strong>SN GUARD: LOGIN REQUIRED</strong>
          <span>Log in to ${result.higherInstance.name.toUpperCase()} (${result.higherHost})</span>
        </div>
        <button id="sn-guard-login-btn">🌐 Log In</button>
      `;
    } else if (result.isOutdated) {
      floatingBadge.className = 'sn-guard-badge outdated';
      floatingBadge.innerHTML = `
        <div class="sn-guard-badge-icon">⚠️</div>
        <div class="sn-guard-badge-text">
          <strong>SN GUARD: OUTDATED</strong>
          <span>Higher instance (${result.higherInstance.name.toUpperCase()}) updated by ${result.higherRecord.sys_updated_by}</span>
        </div>
        <button id="sn-guard-view-diff-btn">View Diff</button>
      `;
    } else {
      floatingBadge.className = 'sn-guard-badge synced';
      floatingBadge.innerHTML = `
        <div class="sn-guard-badge-icon">🛡️</div>
        <div class="sn-guard-badge-text">
          <strong>SN GUARD: SYNCED</strong>
          <span>Up to date with ${result.higherInstance.name.toUpperCase()}</span>
        </div>
      `;
    }

    document.body.appendChild(floatingBadge);

    const diffBtn = document.getElementById('sn-guard-view-diff-btn');
    if (diffBtn) {
      diffBtn.onclick = () => renderDiffModal(result);
    }

    const loginBtn = document.getElementById('sn-guard-login-btn');
    if (loginBtn) {
      loginBtn.onclick = () => {
        window.open(`https://${result.higherHost}`, '_blank');
      };
    }
  }

  /**
   * Render Visual Diff Modal Overlay in Chrome
   */
  function renderDiffModal(result) {
    const existing = document.getElementById('sn-guard-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'sn-guard-modal-overlay';
    overlay.innerHTML = `
      <div class="sn-guard-modal">
        <div class="sn-guard-modal-header">
          <h2>⚠️ Higher Instance Modification Alert</h2>
          <button class="sn-guard-close-btn">&times;</button>
        </div>
        <div class="sn-guard-modal-body">
          <div class="sn-guard-info-banner">
            <p><strong>Record:</strong> ${result.higherRecord.name}</p>
            <p><strong>Higher Instance:</strong> ${result.higherInstance.name.toUpperCase()} (${result.higherInstance.hostname})</p>
            <p><strong>Last Modifier:</strong> ${result.higherRecord.sys_updated_by}</p>
            <p><strong>Last Updated On:</strong> ${result.higherRecord.sys_updated_on}</p>
          </div>
          
          <div class="sn-guard-modal-actions">
            <a href="https://${result.higherInstance.hostname}/nav_to.do?uri=${result.higherRecord.table || 'sys_script_include'}.do?sys_id=${result.higherRecord.sys_id}" target="_blank" class="sn-btn primary">🌐 Open in ${result.higherInstance.name.toUpperCase()}</a>
            <a href="mailto:${result.higherRecord.sys_updated_by}@danone.com?subject=SN Object Guard Conflict Alert: ${encodeURIComponent(result.higherRecord.name)}" class="sn-btn secondary">✉️ Email ${result.higherRecord.sys_updated_by}</a>
          </div>

          <h3>Higher Instance Code (${result.higherInstance.name.toUpperCase()})</h3>
          <pre class="sn-guard-code-preview"><code>${escapeHtml(result.higherRecord.script || '(No script content found)')}</code></pre>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.sn-guard-close-btn').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  function escapeHtml(text) {
    return (text || '')
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /**
   * Main Content Script execution
   */
  function init() {
    const record = detectServiceNowRecord();
    if (!record) return;

    chrome.runtime.sendMessage(
      {
        action: 'CHECK_RECORD',
        hostname: window.location.hostname,
        table: record.table,
        sysId: record.sysId
      },
      (response) => {
        if (response) {
          renderBadge(response);
        }
      }
    );
  }

  // Delay slightly for iframe load
  setTimeout(init, 1500);
})();
