// SN Object Guard Chrome Extension - Background Service Worker

const DEFAULT_CONFIG = {
  pipeline: {
    chain: ["dev", "test", "uat", "prod"]
  },
  instances: {
    dev: { name: "dev", hostname: "danonedev.service-now.com", tier: "dev" },
    test: { name: "test", hostname: "danonetest.service-now.com", tier: "test" },
    uat: { name: "uat", hostname: "danoneuat.service-now.com", tier: "uat" },
    prod: { name: "prod", hostname: "danoneprod.service-now.com", tier: "prod" }
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
  const currentInst = instances.find(inst => 
    inst.hostname.toLowerCase() === currentHost.toLowerCase() ||
    currentHost.toLowerCase().includes(inst.name.toLowerCase())
  );

  if (!currentInst) return null;

  const chain = config.pipeline.chain;
  const index = chain.findIndex(t => t.toLowerCase() === currentInst.tier.toLowerCase() || t.toLowerCase() === currentInst.name.toLowerCase());
  
  if (index === -1 || index >= chain.length - 1) return null;

  const higherTier = chain[index + 1];
  return instances.find(inst => inst.tier.toLowerCase() === higherTier.toLowerCase() || inst.name.toLowerCase() === higherTier.toLowerCase()) || null;
}

// Fetch record from higher instance
async function fetchHigherRecord(higherHost, table, sysId) {
  const fields = 'sys_id,sys_updated_on,sys_updated_by,sys_mod_count,name,script,short_description';
  const url = `https://${higherHost}/api/now/table/${table}/${sysId}?sysparm_fields=${fields}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SN-Object-Guard-Chrome/1.0'
      }
    });

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
        const { config } = await chrome.storage.local.get(['config']);
        const activeConfig = config || DEFAULT_CONFIG;

        const currentHost = request.hostname;
        const higherInst = getHigherInstance(currentHost, activeConfig);

        if (!higherInst) {
          sendResponse({ success: false, reason: `No higher instance mapped for host ${currentHost}` });
          return;
        }

        const higherRecord = await fetchHigherRecord(higherInst.hostname, request.table, request.sysId);

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
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep async channel open
  }
});
