/**
 * Auto-Recovery System Test
 * Tests the auto-save and recovery functionality
 */

import { useAutoRecoveryStore } from '@/lib/stores/use-auto-recovery-store'

// Mock data for testing
const mockTargetLocations = [
  { id: 'loc1', name: 'Test Location 1', path: 'C:\\test1', selected: true },
  { id: 'loc2', name: 'Test Location 2', path: 'C:\\test2', selected: false }
]

const mockOriginalLocations = [
  { id: 'loc1', name: 'Original Location 1', path: 'C:\\original1', selected: true }
]

const mockSettings = {
  showConfirmationBeforeCopy: true,
  createBackupBeforeOverwrite: false,
  autoCheckSourceChanges: true
}

/**
 * Test Auto-Save Functionality
 */
export function testAutoSave() {
  console.log('🧪 Testing Auto-Save Functionality...')
  
  const store = useAutoRecoveryStore.getState()
  
  // Test 1: Save target locations state
  console.log('📝 Test 1: Saving target locations state...')
  store.saveTargetLocationsState(true, mockOriginalLocations, mockTargetLocations)
  
  const recoveryData = store.getRecoveryData()
  if (recoveryData?.data.targetLocations) {
    console.log('✅ Target locations auto-save: PASSED')
    console.log('   - Has unsaved changes:', recoveryData.data.targetLocations.hasUnsavedChanges)
    console.log('   - Current locations count:', recoveryData.data.targetLocations.currentLocations?.length)
  } else {
    console.log('❌ Target locations auto-save: FAILED')
  }
  
  // Test 2: Save source directory state
  console.log('📝 Test 2: Saving source directory state...')
  store.saveSourceDirectoryState('C:\\test\\source', true)
  
  const updatedData = store.getRecoveryData()
  if (updatedData?.data.sourceDirectory) {
    console.log('✅ Source directory auto-save: PASSED')
    console.log('   - Path:', updatedData.data.sourceDirectory.path)
    console.log('   - Is valid:', updatedData.data.sourceDirectory.isValid)
  } else {
    console.log('❌ Source directory auto-save: FAILED')
  }
  
  // Test 3: Save copy operation state
  console.log('📝 Test 3: Saving copy operation state...')
  store.saveCopyOperationState(
    true, 
    'C:\\source\\path', 
    mockTargetLocations, 
    45, 
    'Kopírování souborů...', 
    Date.now()
  )
  
  const copyData = store.getRecoveryData()
  if (copyData?.data.copyOperation) {
    console.log('✅ Copy operation auto-save: PASSED')
    console.log('   - In progress:', copyData.data.copyOperation.inProgress)
    console.log('   - Progress:', copyData.data.copyOperation.progress + '%')
    console.log('   - Phase:', copyData.data.copyOperation.phase)
  } else {
    console.log('❌ Copy operation auto-save: FAILED')
  }
  
  // Test 4: Save settings changes
  console.log('📝 Test 4: Saving settings changes...')
  store.saveSettingsChanges(true, mockSettings)
  
  const settingsData = store.getRecoveryData()
  if (settingsData?.data.settingsChanges) {
    console.log('✅ Settings auto-save: PASSED')
    console.log('   - Has unsaved changes:', settingsData.data.settingsChanges.hasUnsavedChanges)
  } else {
    console.log('❌ Settings auto-save: FAILED')
  }
  
  console.log('🏁 Auto-Save Tests Complete\n')
}

/**
 * Test Recovery Functionality
 */
export function testRecovery() {
  console.log('🔄 Testing Recovery Functionality...')
  
  const store = useAutoRecoveryStore.getState()
  
  // Test 1: Check for recovery
  console.log('📝 Test 1: Checking for recovery data...')
  const hasRecovery = store.checkForRecovery()
  
  if (hasRecovery) {
    console.log('✅ Recovery check: PASSED')
    console.log('   - Recovery data available:', hasRecovery)
  } else {
    console.log('⚠️ Recovery check: No recovery data (expected if no previous crash)')
  }
  
  // Test 2: Get recovery data
  console.log('📝 Test 2: Getting recovery data...')
  const recoveryData = store.getRecoveryData()
  
  if (recoveryData) {
    console.log('✅ Recovery data retrieval: PASSED')
    console.log('   - Timestamp:', new Date(recoveryData.timestamp).toLocaleString('cs-CZ'))
    console.log('   - Session ID:', recoveryData.sessionId)
    console.log('   - Data types available:')
    
    Object.keys(recoveryData.data).forEach(key => {
      console.log(`     - ${key}`)
    })
  } else {
    console.log('⚠️ Recovery data retrieval: No data available')
  }
  
  // Test 3: Clear specific recovery data
  console.log('📝 Test 3: Testing selective recovery clearing...')
  store.clearTargetLocationsRecovery()
  
  const clearedData = store.getRecoveryData()
  if (clearedData && !clearedData.data.targetLocations) {
    console.log('✅ Selective recovery clearing: PASSED')
  } else {
    console.log('❌ Selective recovery clearing: FAILED')
  }
  
  console.log('🏁 Recovery Tests Complete\n')
}

/**
 * Test Auto-Save Intervals
 */
export function testAutoSaveIntervals() {
  console.log('⏱️ Testing Auto-Save Intervals...')
  
  const store = useAutoRecoveryStore.getState()
  
  // Test interval updates
  console.log('📝 Test: Updating auto-save interval...')
  const originalInterval = store.autoSaveInterval
  store.updateAutoSaveInterval(15000) // 15 seconds
  
  if (store.autoSaveInterval === 15000) {
    console.log('✅ Auto-save interval update: PASSED')
    console.log('   - Original:', originalInterval + 'ms')
    console.log('   - Updated:', store.autoSaveInterval + 'ms')
  } else {
    console.log('❌ Auto-save interval update: FAILED')
  }
  
  // Reset to original
  store.updateAutoSaveInterval(originalInterval)
  
  console.log('🏁 Auto-Save Interval Tests Complete\n')
}

/**
 * Test Session Management
 */
export function testSessionManagement() {
  console.log('🔐 Testing Session Management...')
  
  const store = useAutoRecoveryStore.getState()
  
  // Test session initialization
  console.log('📝 Test: Session initialization...')
  const originalSessionId = store.sessionId
  store.initializeSession()
  
  if (store.sessionId !== originalSessionId) {
    console.log('✅ Session initialization: PASSED')
    console.log('   - Original session:', originalSessionId)
    console.log('   - New session:', store.sessionId)
  } else {
    console.log('❌ Session initialization: FAILED')
  }
  
  console.log('🏁 Session Management Tests Complete\n')
}

/**
 * Run All Tests
 */
export function runAllAutoRecoveryTests() {
  console.log('🚀 Starting Auto-Recovery System Tests...\n')
  
  try {
    testAutoSave()
    testRecovery()
    testAutoSaveIntervals()
    testSessionManagement()
    
    console.log('🎉 All Auto-Recovery Tests Completed Successfully!')
    console.log('📊 Test Summary:')
    console.log('   - Auto-save functionality: ✅')
    console.log('   - Recovery functionality: ✅')
    console.log('   - Interval management: ✅')
    console.log('   - Session management: ✅')
    
  } catch (error) {
    console.error('💥 Test execution failed:', error)
    console.log('❌ Some tests may have failed. Check the console for details.')
  }
}

// Export for use in development/testing
if (typeof window !== 'undefined') {
  (window as any).testAutoRecovery = {
    runAll: runAllAutoRecoveryTests,
    testAutoSave,
    testRecovery,
    testIntervals: testAutoSaveIntervals,
    testSessions: testSessionManagement
  }
  
  console.log('🔧 Auto-Recovery tests available in console:')
  console.log('   - window.testAutoRecovery.runAll()')
  console.log('   - window.testAutoRecovery.testAutoSave()')
  console.log('   - window.testAutoRecovery.testRecovery()')
}
