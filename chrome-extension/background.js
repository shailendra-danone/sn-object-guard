// SN Object Guard Chrome Extension - Background Service Worker (DeclarativeNetRequest CORS Bypass & Multi-Auth Engine)

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

/**
 * Configure declarativeNetRequest rules to bypass CORS preflight and allow cross-origin REST Table API calls
 */
async function setupDeclarativeNetRules() {
  try {
    const rules = [
      {
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            { header: "Access-Control-Allow-Origin", operation: "set", value: "*" },
            { header: "Access-Control-Allow-Credentials", operation: "set", value: "true" },
            { header: "Access-Control-Allow-Headers", operation: "set", value: "Authorization, X-UserToken, Content-Type, Accept, User-Agent" },
            { header: "Access-Control-Allow-Methods", operation: "set", value: "GET, OPTIONS, POST" }
          ]
        },
        condition: {
          urlFilter: "service-now.com/api/now/table/",
          resourceTypes: ["xmlhttprequest"]
        }
      }
    ];

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: rules
    });
  } catch (err) {
    console.warn('declarativeNetRequest setup error:', err);
  }
}

// Initialize Storage & Rules
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['config'], (result) => {
    if (!result.config) {
      chrome.storage.local.set({ config: DEFAULT_CONFIG });
    }
  });
  setupDeclarativeNetRules();
});

setupDeclarativeNetRules();

// Helper to get higher instance
function getHigherInstance(currentHost, config) {
  const instances = Object.values(config.instances);
  
  let normalized = currentHost.toLowerCase();
  if (normalized.includes('danonedev')) normalized = 'danonedev.service-now.com';
  if (normalized.includes('danonetest')) normalized = 'danonetest.service-now.com';
  if (normalized.includes('danoneuat') || normalized.includes('danonesandbox')) normalized = 'danonesandbox.service-now.com';
  if (normalized.includes('danoneprod') || normalized === 'danone.service-now.com') normalized = 'danone.service-now.com';

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

/**
 * Unicode-safe Base64 encoder for Basic Auth
 */
function safeBtoa(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return btoa(str);
  }
}

/**
 * Parse and format Authorization header cleanly
 */
function parseAuthHeader(credStr) {
  if (!credStr) return null;
  const trimmed = credStr.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('Basic ') || trimmed.startsWith('Bearer ')) {
    return trimmed;
  }
  if (trimmed.includes(':')) {
    return `Basic ${safeBtoa(trimmed)}`;
  }
  return `Bearer ${trimmed}`;
}

/**
 * Fetch CSRF Token from active browser session on higher host
 */
async function fetchCSRFToken(higherHost) {
  try {
    const res = await fetch(`https://${higherHost}/navpage.do`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'text/html' }
    });
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/var\s+g_ck\s*=\s*['"]([a-fA-F0-9]+)['"]/i) ||
                    html.match(/name=["']sysparm_ck["']\s+value=["']([a-fA-F0-9]+)["']/i);
      if (match && match[1]) return match[1];
    }
  } catch {}
  return null;
}

/**
 * Core ServiceNow Table API Fetcher with Dual-Auth Strategy & CORS Bypass
 */
async function fetchHigherRecord(higherHost, table, sysId, tokenOrCreds, userToken) {
  const fields = 'sys_id,sys_updated_on,sys_updated_by,sys_mod_count,name,script,short_description';
  const url = `https://${higherHost}/api/now/table/${table}/${sysId}?sysparm_fields=${fields}`;

  const authHeader = parseAuthHeader(tokenOrCreds);

  // STRATEGY 1: Explicit Credentials/Token with credentials: 'omit' (Direct REST API Auth)
  if (authHeader) {
    const headers = {
      'Accept': 'application/json',
      'Authorization': authHeader,
      'User-Agent': 'SN-Object-Guard-Chrome/1.0'
    };

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'omit'
      });

      if (response.ok) {
        const data = await response.json();
        return data.result || data;
      }
    } catch (e) {
      console.warn('Basic Auth Fetch Exception:', e);
    }
  }

  // STRATEGY 2: Browser Session / SSO Auth with X-UserToken & credentials: 'include'
  let csrfToken = userToken;
  if (!csrfToken) {
    csrfToken = await fetchCSRFToken(higherHost);
  }

  const sessionHeaders = {
    'Accept': 'application/json',
    'User-Agent': 'SN-Object-Guard-Chrome/1.0'
  };
  if (csrfToken) {
    sessionHeaders['X-UserToken'] = csrfToken;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: sessionHeaders,
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      return data.result || data;
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(`AUTH_401:${higherHost}`);
    }

    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
          sendResponse({ success: false, reason: `No higher instance mapped for host ${currentHost}` });
          return;
        }

        const tokenOrCreds = activeTokens[higherInst.name] || 
                             activeTokens[higherInst.hostname] || 
                             activeTokens[higherInst.tier];

        try {
          const higherRecord = await fetchHigherRecord(
            higherInst.hostname,
            request.table,
            request.sysId,
            tokenOrCreds,
            request.userToken
          );

          const localTime = request.localUpdatedOn ? new Date(request.localUpdatedOn).getTime() : 0;
          const higherTime = new Date(higherRecord.sys_updated_on).getTime();

          const isOutdated = higherTime > localTime;
          const modCountDiff = (parseInt(higherRecord.sys_mod_count || '0', 10)) - (parseInt(request.localModCount || '0', 10));

          sendResponse({
            success: true,
            isOutdated: isOutdated || modCountDiff > 0,
            currentHost,
            higherInstance: higherInst,
            higherHost: higherInst.hostname,
            higherRecord: {
              sys_id: higherRecord.sys_id,
              sys_updated_on: higherRecord.sys_updated_on,
              sys_updated_by: higherRecord.sys_updated_by || 'unknown',
              sys_mod_count: higherRecord.sys_mod_count,
              name: higherRecord.name || higherRecord.short_description || request.sysId,
              script: higherRecord.script || '',
              table: request.table
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
              error: `🔑 Authentication required for ${higherInst.name.toUpperCase()} (${host}). Enter username:password or Token below.`
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
