document.addEventListener('DOMContentLoaded', () => {
  const devHostInput = document.getElementById('devHost');
  const testHostInput = document.getElementById('testHost');
  const uatHostInput = document.getElementById('uatHost');
  const prodHostInput = document.getElementById('prodHost');
  const saveBtn = document.getElementById('save-btn');
  const statusDiv = document.getElementById('status');

  // Load stored settings
  chrome.storage.local.get(['config'], (result) => {
    if (result.config && result.config.instances) {
      if (result.config.instances.dev) devHostInput.value = result.config.instances.dev.hostname;
      if (result.config.instances.test) testHostInput.value = result.config.instances.test.hostname;
      if (result.config.instances.uat || result.config.instances.sandbox) {
        uatHostInput.value = (result.config.instances.sandbox || result.config.instances.uat).hostname;
      }
      if (result.config.instances.prod) prodHostInput.value = result.config.instances.prod.hostname;
    }
  });

  // Save settings
  saveBtn.onclick = () => {
    const config = {
      pipeline: { chain: ["dev", "test", "uat", "prod"] },
      instances: {
        dev: { name: "dev", hostname: devHostInput.value.trim(), tier: "dev" },
        test: { name: "test", hostname: testHostInput.value.trim(), tier: "test" },
        uat: { name: "uat", hostname: uatHostInput.value.trim(), tier: "uat" },
        sandbox: { name: "sandbox", hostname: uatHostInput.value.trim(), tier: "uat" },
        prod: { name: "prod", hostname: prodHostInput.value.trim(), tier: "prod" }
      }
    };

    chrome.storage.local.set({ config }, () => {
      statusDiv.textContent = '✅ Settings saved successfully!';
      setTimeout(() => { statusDiv.textContent = ''; }, 3000);
    });
  };
});
