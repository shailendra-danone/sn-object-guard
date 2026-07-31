#!/usr/bin/env node
import { DesktopCompanion } from './DesktopCompanion';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  if (command === 'check') {
    const fileIndex = args.indexOf('--file');
    const filePath = fileIndex !== -1 ? args[fileIndex + 1] : args[1];
    
    if (!filePath) {
      console.error('Error: Please specify a file path using --file <path>');
      process.exit(1);
    }

    try {
      const companion = new DesktopCompanion();
      console.log(`[SN Guard CLI] Checking ${filePath}...`);
      const result = await companion.checkFile(filePath);

      if (!result) {
        console.log('[SN Guard CLI] No higher instance conflict detected.');
        process.exit(0);
        return;
      }

      if (result.isOutdated) {
        console.error(`\n❌ [WARNING] Record '${result.currentRecord.name}' is OUTDATED!`);
        console.error(`Higher Instance: ${result.higherInstance.name} (${result.higherInstance.hostname})`);
        console.error(`Last Modifier: ${result.higherRecord.sys_updated_by}`);
        console.error(`Last Updated: ${result.higherRecord.sys_updated_on}`);
        console.error(`Reason: ${result.reason}\n`);
        process.exit(2);
      } else {
        console.log('✅ [SN Guard CLI] File is synchronized with higher instance.');
        process.exit(0);
      }
    } catch (err: any) {
      console.error(`[SN Guard CLI] Error checking file: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log(`
SN Object Guard - Desktop Companion CLI

Usage:
  sn-object-guard check --file <path-to-file>   Check file against higher instance
  sn-object-guard help                          Show this help menu
`);
  }
}

main();
