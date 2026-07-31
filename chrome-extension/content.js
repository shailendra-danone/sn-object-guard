// SN Object Guard Chrome Extension - Content Script (Main World Bridge + Deep DOM & URL Scanner)

(function () {
  let floatingBadge = null;
  let detectedRecord = null;
  let detectedUserToken = '';

  /**
   * Inject Main World Script to access window.g_form, window.NOW, and window.g_ck directly
   */
  function injectMainWorldBridge() {
    try {
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          function checkAndPost() {
            try {
              var table = null;
              var sysId = null;
              var userToken = window.g_ck || (window.top && window.top.g_ck) || '';

              if (window.g_form && typeof window.g_form.getTableName === 'function') {
                table = window.g_form.getTableName();
                sysId = window.g_form.getUniqueValue();
              } else if (window.NOW && window.NOW.sys_id) {
                table = window.NOW.target || window.NOW.table;
                sysId = window.NOW.sys_id;
              }

              if (sysId && sysId !== '-1' && /^[a-fA-F0-9]{32}$/.test(sysId)) {
                window.postMessage({
                  type: 'SN_GUARD_MAIN_WORLD_DATA',
                  table: table,
                  sysId: sysId,
                  userToken: userToken
                }, '*');
              }
            } catch(e) {}
          }
          checkAndPost();
          setTimeout(checkAndPost, 1000);
          setTimeout(checkAndPost, 3000);
        })();
      `;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch {}
  }

  // Listen for messages posted from Main World Script
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SN_GUARD_MAIN_WORLD_DATA') {
      if (event.data.table && event.data.sysId) {
        detectedRecord = { table: event.data.table, sysId: event.data.sysId };
        if (event.data.userToken) detectedUserToken = event.data.userToken;
        triggerCheck();
      }
    }
  });

  /**
   * Comprehensive DOM Input & Element Inspector
   */
  function inspectDOMForRecord() {
    try {
      // Inputs for sys_id
      const sysIdInputs = [
        document.getElementById('sys_unique_value'),
        document.querySelector('input[name="sys_id"]'),
        document.querySelector('input[name="sysparm_sys_id"]'),
        document.querySelector('input[id="sys_id"]')
      ];

      let sysId = null;
      for (const input of sysIdInputs) {
        if (input && input.value && /^[a-fA-F0-9]{32}$/.test(input.value)) {
          sysId = input.value;
          break;
        }
      }

      // Inputs for table
      const tableInputs = [
        document.getElementById('sys_target'),
        document.querySelector('input[name="sys_target"]'),
        document.querySelector('input[name="sysparm_tableName"]'),
        document.querySelector('input[name="sysparm_table_name"]'),
        document.querySelector('input[name="table"]')
      ];

      let table = null;
      for (const input of tableInputs) {
        if (input && input.value && input.value !== 'nav_to' && input.value !== 'navpage') {
          table = input.value;
          break;
        }
      }

      // Fallback table from pathname (e.g. /sys_script_include.do)
      if (!table) {
        const pathMatch = window.location.pathname.match(/\/([a-zA-Z0-9_]+)\.do/);
        if (pathMatch && pathMatch[1] !== 'nav_to' && pathMatch[1] !== 'navpage') {
          table = pathMatch[1];
        }
      }

      if (sysId && table) {
        return { table, sysId };
      }
    } catch {}

    return null;
  }

  /**
   * Deep URL Scanner (decoding query strings, iframe URLs, and Polaris targets)
   */
  function inspectURLsForRecord() {
    const urlsToTest = [
      window.location.href,
      window.location.search,
      window.location.hash
    ];

    try {
      if (window.top && window.top.location) {
        urlsToTest.push(window.top.location.href);
        urlsToTest.push(window.top.location.search);
        urlsToTest.push(window.top.location.hash);
      }
    } catch {}

    for (const rawUrl of urlsToTest) {
      if (!rawUrl) continue;
      
      let url = rawUrl;
      try { url = decodeURIComponent(rawUrl); } catch {}
      try { url = decodeURIComponent(url); } catch {} // double decode for encoded Polaris params

      // Pattern 1: sys_script_include.do?sys_id=32hex
      const match1 = url.match(/\/([a-zA-Z0-9_]+)\.do\?.*sys_id=([a-fA-F0-9]{32})/i);
      if (match1 && match1[1] !== 'nav_to' && match1[1] !== 'navpage') {
        return { table: match1[1], sysId: match1[2] };
      }

      // Pattern 2: target/sys_script_include.do?sys_id=32hex or target=sys_script_include.do?sys_id=32hex
      const match2 = url.match(/([a-zA-Z0-9_]+)\.do.*sys_id[=%3D]([a-fA-F0-9]{32})/i);
      if (match2 && match2[1] !== 'nav_to' && match2[1] !== 'navpage') {
        return { table: match2[1], sysId: match2[2] };
      }

      // Pattern 3: Any 32-hex string alongside a known table or sys_target
      const sysIdMatch = url.match(/\b([a-fA-F0-9]{32})\b/);
      const tableMatch = url.match(/(?:table|sys_target|target)[=%3D\/]([a-zA-Z0-9_]+)/i);
      if (sysIdMatch && tableMatch && tableMatch[1] !== 'nav_to' && tableMatch[1] !== 'navpage') {
        return { table: tableMatch[1], sysId: sysIdMatch[1] };
      }
    }

    // Inspect iframe gsft_main if on top window
    try {
      const iframe = document.getElementById('gsft_main');
      if (iframe && iframe.contentWindow) {
        let iframeUrl = iframe.contentWindow.location.href;
        try { iframeUrl = decodeURIComponent(iframeUrl); } catch {}
        const matchIframe = iframeUrl.match(/\/([a-zA-Z0-9_]+)\.do\?.*sys_id=([a-fA-F0-9]{32})/i);
        if (matchIframe) {
          return { table: matchIframe[1], sysId: matchIframe[2] };
        }
      }
    } catch {}

    return null;
  }

  /**
   * Universal Record Detection Master
   */
  function detectRecord() {
    if (detectedRecord) return detectedRecord;

    const domRecord = inspectDOMForRecord();
    if (domRecord) return domRecord;

    const urlRecord = inspectURLsForRecord();
    if (urlRecord) return urlRecord;

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
          <strong>SN GUARD: AUTH REQUIRED</strong>
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
    if (diffBtn) diffBtn.onclick = () => renderDiffModal(result);

    const loginBtn = document.getElementById('sn-guard-login-btn');
    if (loginBtn) loginBtn.onclick = () => window.open(`https://${result.higherHost}`, '_blank');
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
    return (text || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Listen for direct queries from Extension Popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_CURRENT_RECORD') {
      const record = detectRecord();
      sendResponse({ record, userToken: detectedUserToken, hostname: window.location.hostname });
    }
  });

  function triggerCheck() {
    const record = detectRecord();
    if (!record) return;

    chrome.runtime.sendMessage(
      {
        action: 'CHECK_RECORD',
        hostname: window.location.hostname,
        table: record.table,
        sysId: record.sysId,
        userToken: detectedUserToken
      },
      (response) => {
        if (response) {
          renderBadge(response);
        }
      }
    );
  }

  // Execution steps
  injectMainWorldBridge();
  setTimeout(triggerCheck, 1000);
  setTimeout(triggerCheck, 3000);
})();
