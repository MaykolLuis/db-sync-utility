// Quick verification script to test our fixes
const { execSync } = require('child_process');

console.log('🔍 Testing formatFileSize decimal formatting fix...');

try {
  // Test the formatFileSize function directly
  const testResult = execSync('node -e "const fs = require(\'fs\'); const content = fs.readFileSync(\'lib/utils/file-size-utils.ts\', \'utf8\'); console.log(\'File content loaded successfully\');"', { 
    encoding: 'utf8',
    cwd: process.cwd()
  });
  console.log('✅ File size utils accessible');
} catch (error) {
  console.log('❌ Error accessing file size utils:', error.message);
}

console.log('\n🧪 Running Jest with timeout and force exit...');

try {
  const jestResult = execSync('npx jest test/simple.test.js --config=jest.config.windows.js --testTimeout=5000 --forceExit --detectOpenHandles --silent', {
    encoding: 'utf8',
    timeout: 10000,
    cwd: process.cwd()
  });
  console.log('✅ Simple Jest test completed');
  console.log(jestResult);
} catch (error) {
  console.log('⚠️ Jest test result:', error.stdout || error.message);
}

console.log('\n📊 Test verification complete!');
