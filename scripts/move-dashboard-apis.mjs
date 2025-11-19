// Script to help identify and move dashboard APIs
// This is a reference script - actual moves will be done manually

const dashboardAPIs = [
  'menu',
  'orders',
  'tables',
  'tax',
  'station',
  'printer',
  'prep-zone',
  'events',
  'modifiers',
  'modifier-groups',
  'modifier-items',
  'reports',
  'settings',
  'users',
  'outlets',
]

console.log('Dashboard APIs to move:')
dashboardAPIs.forEach(api => {
  console.log(`  /api/${api} → /api/dashboard/${api}`)
})

console.log('\nMaster APIs (already in correct location):')
console.log('  /api/master/* (keep as is)')
console.log('  /api/companies → /api/master/companies')
console.log('  /api/dealers → /api/master/dealers')
console.log('  /api/locations → /api/master/locations')

