document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('status-container');
  const recheckBtn = document.getElementById('recheck-btn');

  function checkTab() {
    container.innerHTML = `<div class="status-card"><div class="meta-line">Checking ServiceNow record...</div></div>`;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;

      const tab = tabs[0];
      const url = tab.url;

      const match = url.match(/\/([a-zA-Z0-9_]+)\.do\?.*sys_id=([a-fA-F0-9]{32})/);
      if (!match) {
        container.innerHTML = `
          <div class="status-card">
            <div class="meta-line">⚠️ Active tab is not an open ServiceNow record.</div>
            <div class="meta-line" style="opacity:0.6; font-size:11px;">Open a Script Include, BR, or Widget form in ServiceNow to test.</div>
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
          if (!res || !res.success) {
            container.innerHTML = `
              <div class="status-card">
                <div class="meta-line">⚠️ ${res?.reason || res?.error || 'Unable to query higher instance.'}</div>
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
