document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('status-container');
  const recheckBtn = document.getElementById('recheck-btn');

  function checkTab() {
    container.innerHTML = `<div class="status-card"><div class="meta-line">Checking ServiceNow record...</div></div>`;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].url) return;

      const tab = tabs[0];
      const url = tab.url;

      const match = url.match(/\/([a-zA-Z0-9_]+)\.do\?.*sys_id=([a-fA-F0-9]{32})/);
      if (!match) {
        container.innerHTML = `
          <div class="status-card">
            <div class="meta-line">⚠️ Active tab is not an open ServiceNow record.</div>
            <div class="meta-line" style="opacity:0.6; font-size:11px; margin-top:4px;">Open a Script Include, Business Rule, or Widget form in ServiceNow to test.</div>
          </div>
        `;
        return;
      }

      const table = match[1];
      const sysId = match[2];
      const hostname = new URL(url).hostname;

      chrome.runtime.sendMessage(
        { action: 'CHECK_RECORD', hostname, table, sysId },
        (res) => {
          if (!res) {
            container.innerHTML = `
              <div class="status-card">
                <div class="meta-line">⚠️ Unable to query background extension.</div>
              </div>
            `;
            return;
          }

          if (res.isAuthError) {
            const instName = (res.higherInstance?.name || 'TEST').toUpperCase();
            const host = res.higherHost || 'danonetest.service-now.com';

            container.innerHTML = `
              <div class="status-card outdated">
                <span class="badge outdated">🔑 ${instName} Login Required</span>
                <div class="meta-line">Chrome needs authentication for target higher instance:</div>
                <div class="meta-line"><strong>${instName}</strong> (<code>${host}</code>)</div>
                
                <div style="margin-top:12px; font-weight:600; font-size:11px; color:#f38ba8;">METHOD 1: Log in via SSO</div>
                <button id="login-higher-btn" style="margin-top:4px; background:#f38ba8; color:#11111b;">🌐 Open & Log In to ${instName} in Chrome</button>
                
                <div style="margin-top:12px; font-weight:600; font-size:11px; color:#89b4fa;">METHOD 2: Enter Access Token or Credentials</div>
                <input type="password" id="inline-token-input" placeholder="Bearer Token or username:password">
                <button id="save-token-btn" style="margin-top:6px; background:#89b4fa; color:#11111b;">💾 Save Token & Retry Check</button>
              </div>
            `;

            const loginBtn = document.getElementById('login-higher-btn');
            if (loginBtn) {
              loginBtn.onclick = () => {
                chrome.tabs.create({ url: `https://${host}` });
              };
            }

            const saveTokenBtn = document.getElementById('save-token-btn');
            const tokenInput = document.getElementById('inline-token-input');
            if (saveTokenBtn && tokenInput) {
              saveTokenBtn.onclick = () => {
                const val = tokenInput.value.trim();
                if (!val) return;

                chrome.storage.local.get(['tokens'], (store) => {
                  const tokens = store.tokens || {};
                  const key = res.higherInstance?.name || 'test';
                  tokens[key] = val;
                  tokens[host] = val;
                  chrome.storage.local.set({ tokens }, () => {
                    checkTab(); // Re-check immediately after saving token!
                  });
                });
              };
            }
            return;
          }

          if (!res.success) {
            container.innerHTML = `
              <div class="status-card">
                <div class="meta-line">⚠️ ${res.reason || res.error || 'Unable to query higher instance.'}</div>
              </div>
            `;
            return;
          }

          if (res.isOutdated) {
            container.innerHTML = `
              <div class="status-card outdated">
                <span class="badge outdated">Higher Instance Outdated</span>
                <div class="meta-line"><strong>Higher Instance:</strong> ${res.higherInstance.name.toUpperCase()}</div>
                <div class="meta-line"><strong>Last Modifier:</strong> ${res.higherRecord.sys_updated_by}</div>
                <div class="meta-line"><strong>Updated On:</strong> ${res.higherRecord.sys_updated_on}</div>
              </div>
            `;
          } else {
            container.innerHTML = `
              <div class="status-card synced">
                <span class="badge synced">Synchronized</span>
                <div class="meta-line">Record matches higher instance (${res.higherInstance.name.toUpperCase()}).</div>
              </div>
            `;
          }
        }
      );
    });
  }

  recheckBtn.onclick = checkTab;
  checkTab();
});
