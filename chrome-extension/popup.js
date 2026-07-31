document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('status-container');
  const recheckBtn = document.getElementById('recheck-btn');

  function parseUrlForRecord(rawUrl) {
    if (!rawUrl) return null;
    let url = rawUrl;
    try { url = decodeURIComponent(rawUrl); } catch {}
    try { url = decodeURIComponent(url); } catch {}

    const match1 = url.match(/\/([a-zA-Z0-9_]+)\.do\?.*sys_id=([a-fA-F0-9]{32})/i);
    if (match1 && match1[1] !== 'nav_to' && match1[1] !== 'navpage') {
      return { table: match1[1], sysId: match1[2] };
    }

    const match2 = url.match(/([a-zA-Z0-9_]+)\.do.*sys_id[=%3D]([a-fA-F0-9]{32})/i);
    if (match2 && match2[1] !== 'nav_to' && match2[1] !== 'navpage') {
      return { table: match2[1], sysId: match2[2] };
    }

    const sysIdMatch = url.match(/\b([a-fA-F0-9]{32})\b/);
    const tableMatch = url.match(/(?:table|sys_target|target)[=%3D\/]([a-zA-Z0-9_]+)/i);
    if (sysIdMatch && tableMatch && tableMatch[1] !== 'nav_to' && tableMatch[1] !== 'navpage') {
      return { table: tableMatch[1], sysId: sysIdMatch[1] };
    }

    return null;
  }

  function checkTab() {
    container.innerHTML = `<div class="status-card"><div class="meta-line">Checking ServiceNow record...</div></div>`;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].url) {
        container.innerHTML = `<div class="status-card"><div class="meta-line">⚠️ No active tab found.</div></div>`;
        return;
      }

      const activeTab = tabs[0];
      const hostname = new URL(activeTab.url).hostname;

      chrome.tabs.sendMessage(activeTab.id, { action: 'GET_CURRENT_RECORD' }, (response) => {
        let record = response?.record || parseUrlForRecord(activeTab.url);
        let userToken = response?.userToken;

        if (!record) {
          container.innerHTML = `
            <div class="status-card">
              <div class="meta-line">⚠️ Active tab is not an open ServiceNow record.</div>
              <div class="meta-line" style="opacity:0.6; font-size:11px; margin-top:4px;">Open a Script Include, Business Rule, or Widget form in ServiceNow to test.</div>
            </div>
          `;
          return;
        }

        chrome.runtime.sendMessage(
          {
            action: 'CHECK_RECORD',
            hostname: response?.hostname || hostname,
            table: record.table,
            sysId: record.sysId,
            userToken
          },
          (res) => {
            if (!res) {
              container.innerHTML = `<div class="status-card"><div class="meta-line">⚠️ Unable to query background extension.</div></div>`;
              return;
            }

            if (res.isAuthError) {
              const instName = (res.higherInstance?.name || 'TEST').toUpperCase();
              const host = res.higherHost || 'danonetest.service-now.com';

              container.innerHTML = `
                <div class="status-card outdated">
                  <span class="badge outdated">🔑 ${instName} AUTH REQUIRED</span>
                  <div class="meta-line" style="margin-bottom:8px;">Target: <strong>${instName}</strong> (<code>${host}</code>)</div>
                  
                  <div style="background:#11111b; padding:10px; border-radius:6px; border:1px solid #45475a; margin-top:6px;">
                    <div style="font-weight:600; font-size:11px; color:#a6e3a1; margin-bottom:4px;">Option A: Enter Admin / User Credentials</div>
                    <input type="text" id="popup-user-input" placeholder="Username (e.g. admin)" style="margin-bottom:6px;">
                    <input type="password" id="popup-pass-input" placeholder="Password or Token">
                    <button id="save-creds-btn" style="margin-top:8px; background:#a6e3a1; color:#11111b; font-weight:700;">💾 Save Credentials & Check Now</button>
                  </div>

                  <div style="margin-top:12px; font-weight:600; font-size:11px; color:#89b4fa;">Option B: Browser SSO Session</div>
                  <button id="login-higher-btn" style="margin-top:4px; background:#313244; color:#cdd6f4;">🌐 Open ${instName} in Tab to Log In</button>
                </div>
              `;

              const loginBtn = document.getElementById('login-higher-btn');
              if (loginBtn) {
                loginBtn.onclick = () => chrome.tabs.create({ url: `https://${host}` });
              }

              const saveCredsBtn = document.getElementById('save-creds-btn');
              const userInput = document.getElementById('popup-user-input');
              const passInput = document.getElementById('popup-pass-input');

              if (saveCredsBtn && userInput && passInput) {
                saveCredsBtn.onclick = () => {
                  const u = userInput.value.trim();
                  const p = passInput.value.trim();

                  if (!p) return;
                  const combined = u ? `${u}:${p}` : p;

                  chrome.storage.local.get(['tokens'], (store) => {
                    const tokens = store.tokens || {};
                    const key = res.higherInstance?.name || 'test';
                    tokens[key] = combined;
                    tokens[host] = combined;
                    tokens[res.higherInstance?.tier || 'test'] = combined;

                    chrome.storage.local.set({ tokens }, () => {
                      checkTab(); // Instant re-check with new credentials!
                    });
                  });
                };
              }
              return;
            }

            if (!res.success) {
              container.innerHTML = `<div class="status-card"><div class="meta-line">⚠️ ${res.reason || res.error || 'Unable to query higher instance.'}</div></div>`;
              return;
            }

            if (res.isOutdated) {
              container.innerHTML = `
                <div class="status-card outdated">
                  <span class="badge outdated">Higher Instance Outdated</span>
                  <div class="meta-line"><strong>Record:</strong> ${res.higherRecord.name}</div>
                  <div class="meta-line"><strong>Higher Instance:</strong> ${res.higherInstance.name.toUpperCase()} (${res.higherHost})</div>
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
    });
  }

  recheckBtn.onclick = checkTab;
  checkTab();
});
