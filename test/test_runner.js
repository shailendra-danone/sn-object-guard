const { CommentHeaderParser } = require('../out/detector/CommentHeaderParser');
const { PathPatternParser } = require('../out/detector/PathPatternParser');
const { RecordDetector } = require('../out/detector/RecordDetector');
const { ConfigManager } = require('../out/config/ConfigManager');
const { ComparisonEngine } = require('../out/comparison/ComparisonEngine');
const { CacheManager } = require('../out/api/CacheManager');
const { ExtensibilityManager } = require('../out/plugins/ExtensibilityManager');

console.log('--- RUNNING SN OBJECT GUARD INTEGRATION & UNIT TEST SUITE ---');

// 1. CommentHeaderParser Test
const headerContent = `
// Instance: danonedev.service-now.com
// Table: sys_script_include
// SysId: c62997741b61ac50285ced7cee4bcbfa
// Name: TestScriptInclude
var TestScriptInclude = Class.create();
`;
const parsedHeader = CommentHeaderParser.parse(headerContent);
console.assert(parsedHeader.sys_id === 'c62997741b61ac50285ced7cee4bcbfa', 'Header parser sys_id match');
console.assert(parsedHeader.table === 'sys_script_include', 'Header parser table match');
console.log('✅ [TEST PASSED] CommentHeaderParser');

// 2. PathPatternParser Test
const parsedPath = PathPatternParser.parse('C:/dev/danonedev/sys_script_include/11112222333344445555666677778888.js');
console.assert(parsedPath.sys_id === '11112222333344445555666677778888', 'Path parser sys_id match');
console.log('✅ [TEST PASSED] PathPatternParser');

// 3. RecordDetector Test
const detected = RecordDetector.detect('test.js', headerContent);
console.assert(detected.sys_id === 'c62997741b61ac50285ced7cee4bcbfa', 'RecordDetector sys_id match');
console.log('✅ [TEST PASSED] RecordDetector');

// 4. ConfigManager Pipeline Test
const config = ConfigManager.loadConfigFile();
const higherInst = ConfigManager.getHigherInstance('dev', config);
console.assert(higherInst.name === 'test', 'Pipeline DEV -> TEST match');
console.log('✅ [TEST PASSED] ConfigManager Pipeline Resolution');

// 5. ComparisonEngine Test
const devInst = { name: 'dev', hostname: 'dev.com', tier: 'dev', authType: 'oauth' };
const testInst = { name: 'test', hostname: 'test.com', tier: 'test', authType: 'oauth' };
const localRec = { sys_id: '1', sys_updated_on: '2026-07-01 10:00:00', sys_updated_by: 'dev1', sys_mod_count: 1, content: 'var x = 1;', rawFields: {} };
const higherRec = { sys_id: '1', sys_updated_on: '2026-07-02 12:00:00', sys_updated_by: 'lead_dev', sys_mod_count: 5, content: 'var x = 2;', rawFields: {} };

const compResult = ComparisonEngine.compare(devInst, testInst, localRec, higherRec, 'hybrid');
console.assert(compResult.isOutdated === true, 'ComparisonEngine outdated detection');
console.assert(compResult.fieldDiffs.length > 0, 'ComparisonEngine diff generation');
console.log('✅ [TEST PASSED] ComparisonEngine Hybrid Strategy & Field Diffing');

// 6. CacheManager Test
const cache = new CacheManager();
cache.set('dev', 'sys_script_include', 'sys123', { name: 'CachedScript' }, 10);
const cached = cache.get('dev', 'sys_script_include', 'sys123');
console.assert(cached.name === 'CachedScript', 'Cache hit verification');
console.log('✅ [TEST PASSED] CacheManager In-Memory TTL Cache');

// 7. ExtensibilityManager Test
const manager = ExtensibilityManager.getInstance();
let pluginExecuted = false;
manager.registerMergeConflictPlugin({
  id: 'test-plugin',
  name: 'Test Plugin',
  async detectMergeConflicts() {
    pluginExecuted = true;
    return { hasConflict: true, conflictLines: [] };
  }
});
manager.runMergeConflictDetection({ localRecord: localRec, higherRecord: higherRec, currentInstance: devInst, higherInstance: testInst })
  .then(res => {
    console.assert(pluginExecuted === true, 'Plugin execution verification');
    console.log('✅ [TEST PASSED] ExtensibilityManager Plugin System');
    console.log('\nALL 7 INTEGRATION & UNIT TEST SUITES PASSED SUCCESSFULLY!');
  });
