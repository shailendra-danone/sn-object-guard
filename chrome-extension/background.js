// SN Object Guard Chrome Extension - Background Service Worker

const DEFAULT_CONFIG = {
  pipeline: {
    chain: ["dev", "test", "uat", "prod"]
  },
  instances: {
    dev: { name: "dev", hostname: "danonedev.service-now.com", tier: "dev" },
    test: { name: "test", hostname: "danonetest.service-now.com", tier: "test" },
    uat: { name: "uat", hostname: "danonesandbox.service-now.com", tier: "uat" },
    sandbox: { name: "sandbox", hostname: "danonesandbox.service-now.com", tier: "uat" },
    prod: { name: "prod", hostname: "danone.service-now.com", tier: "prod" }
  }
};

// Initialize Storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['config'], (result) => {
    if (!result.config) {
      chrome.storage.local.set({ config: DEFAULT_CONFIG });
    }
  });
});

// Helper to get higher instance
function getHigherInstance(currentHost, config) {
  const instances = Object.values(config.instances);
  
  let normalized = currentHost.toLowerCase();
  if (normalized.includes('danoneuat')) normalized = 'danonesandbox.service-now.com';
  if (normalized.includes('danoneprod')) normalized = 'danone.service-now.com';

  const currentInst = instances.find(inst => 
    inst.hostname.toLowerCase() === normalized ||
    normalized.includes(inst.name.toLowerCase())
  );

  if (!currentInst) return null;

  const chain = config.pipeline.chain;
  const index = chain.findIndex(t => t.toLowerCase() === currentInst.tier.toLowerCase() || t.toLowerCase() === currentInst.name.toLowerCase());
  
  if (index === -1 || index >= chain.length - 1) return null;

  const higherTier = chain[index + 1];
  return instances.find(inst => inst.tier.toLowerCase() === higherTier.toLowerCase() || inst.name.toLowerCase() === higherTier.toLowerCase()) || null;
}

// Fetch record from higher instance
async function fetchHigherRecord(higherHost, table, sysId, token) {
  const fields = 'sys_id,sys_updated_on,sys_updated_by,sys_mod_count,name,script,short_description';
  const url = `https://${higherHost}/api/now/table/${table}/${sysId}?sysparm_fields=${fields}`;

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'SN-Object-Guard-Chrome/1.0'
  };

  if (token) {
    if (token.startsWith('Basic ') || token.startsWith('Bearer ')) {
      headers['Authorization'] = token;
    } else {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include' // Include session cookies for higher instance if logged in
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error(`AUTH_401:${higherHost}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result || data;
  } catch (err) {
    console.error('Fetch Higher Record Error:', err);
    throw err;
  }
}

// Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CHECK_RECORD') {
    (async () => {
      try {
        const { config, tokens } = await chrome.storage.local.get(['config', 'tokens']);
        const activeConfig = config || DEFAULT_CONFIG;
        const activeTokens = tokens || {};

        const currentHost = request.hostname;
        const higherInst = getHigherInstance(currentHost, activeConfig);

        if (!higherInst) {
          sendResponse({ success: false, reason: `No higher instance mapped for ${currentHost}` });
          return;
        }

        const token = activeTokens[higherInst.name] || activeTokens[higherInst.hostname];

        try {
          const higherRecord = await fetchHigherRecord(higherInst.hostname, request.table, request.sysId, token);

          const localTime = request.localUpdatedOn ? new Date(request.localUpdatedOn).getTime() : 0;
          const higherTime = new Date(higherRecord.sys_updated_on).getTime();

          const isOutdated = higherTime > localTime;
          const modCountDiff = (parseInt(higherRecord.sys_mod_count || '0', 10)) - (parseInt(request.localModCount || '0', 10));

          sendResponse({
            success: true,
            isOutdated: isOutdated || modCountDiff > 0,
            currentHost,
            higherInstance: higherInst,
            higherRecord: {
              sys_id: higherRecord.sys_id,
              sys_updated_on: higherRecord.sys_updated_on,
              sys_updated_by: higherRecord.sys_updated_by || 'unknown',
              sys_mod_count: higherRecord.sys_mod_count,
              name: higherRecord.name || higherRecord.short_description || request.sysId,
              script: higherRecord.script || ''
            },
            reason: isOutdated 
              ? `Higher instance (${higherInst.name.toUpperCase()}) was updated on ${higherRecord.sys_updated_on} by ${higherRecord.sys_updated_by}`
              : 'Record is synchronized with higher instance.'
          });
        } catch (err) {
          if (err.message && err.message.startsWith('AUTH_401:')) {
            const host = err.message.split(':')[1];
            sendResponse({
              success: false,
              isAuthError: true,
              higherHost: host,
              higherInstance: higherInst,
              error: `🔑 Authentication required for higher instance (${higherInst.name.toUpperCase()}: ${host}). Please log into ${host} in Chrome or set an Access Token in Extension Options.`
            });
          } else {
            sendResponse({ success: false, error: err.message });
          }
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep async channel open
  }
});
