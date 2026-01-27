# Sync System Documentation Index

Complete documentation suite for the Restaurant POS Sync System.

## 📚 Documentation Files

### 1. [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md)
**Complete technical documentation** with detailed explanations of:
- System architecture and components
- All 24 sync tables and their relationships
- Sync implementation details
- Sync service architecture
- API endpoints and usage
- Error handling and retry logic
- Code generation mechanisms
- Best practices

**Use this when:** You need deep technical understanding of how the sync system works.

---

### 2. [SYNC_SYSTEM_DIAGRAMS.md](./SYNC_SYSTEM_DIAGRAMS.md)
**Visual diagrams and flowcharts** including:
- System architecture diagrams
- Data flow diagrams
- Table relationship diagrams
- Sync process flowcharts
- Error handling flows
- Code generation flows

**Use this when:** You need visual understanding of the system architecture and flows.

---

### 3. [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md)
**Quick reference guide** with:
- Quick facts and statistics
- Table list with dependencies
- API endpoint examples
- Code patterns and snippets
- Common issues and solutions
- Testing commands
- Monitoring queries

**Use this when:** You need quick answers or code examples while developing.

---

### 4. [SYNC_UI_GUIDE.md](./SYNC_UI_GUIDE.md)
**User interface guide** covering:
- How to access sync management page
- UI features and tabs
- How to trigger syncs
- How to monitor sync status
- How to view sync logs

**Use this when:** You need to understand how to use the sync management UI.

---

## 🎯 Quick Navigation by Topic

### Understanding the System
- **Architecture**: See [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#system-architecture)
- **Visual Diagrams**: See [SYNC_SYSTEM_DIAGRAMS.md](./SYNC_SYSTEM_DIAGRAMS.md)
- **Component Overview**: See [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#sync-service-architecture)

### Working with Tables
- **All Tables List**: See [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#sync-tables)
- **Table Dependencies**: See [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#sync-tables-and-dependencies)
- **Sync Order**: See [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#sync-order)
- **Table Relationships**: See [SYNC_SYSTEM_DIAGRAMS.md](./SYNC_SYSTEM_DIAGRAMS.md#table-relationship-diagrams)

### API Usage
- **API Endpoints**: See [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#api-endpoints)
- **Quick Examples**: See [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#api-endpoints)
- **Testing Commands**: See [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#testing-sync)

### Implementation Details
- **Sync Flow**: See [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#sync-flow-diagrams)
- **Code Patterns**: See [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#code-patterns)
- **Error Handling**: See [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#error-handling-and-retry-logic)
- **Code Generation**: See [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#code-generation-and-triggers)

### Troubleshooting
- **Common Issues**: See [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#common-issues)
- **Error Handling**: See [SYNC_SYSTEM_DIAGRAMS.md](./SYNC_SYSTEM_DIAGRAMS.md#error-handling-flows)
- **Monitoring**: See [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#monitoring)

### Using the UI
- **UI Guide**: See [SYNC_UI_GUIDE.md](./SYNC_UI_GUIDE.md)
- **Access URL**: `http://localhost:3000/master/sync`

---

## 📊 System Overview

### Key Statistics
- **Total Syncable Tables**: 24
- **Sync Types**: Incremental, Full, Location-to-Location
- **Default Batch Size**: 100 records
- **Max Retries**: 3 attempts
- **Primary Matching Field**: `sync_id` (UUID)

### Architecture Components
1. **Master Database**: Central repository with master data templates
2. **Location Databases**: Individual databases per restaurant/store
3. **Sync Service Layer**: Orchestrates sync operations
4. **Sync Processor**: Processes individual records
5. **Sync Validator**: Validates data before syncing
6. **API Layer**: RESTful endpoints for sync operations

### Sync Flow Summary
```
Master Table Change → Database Trigger → sync_log Entry → 
Sync Service → Sync Processor → Location Database
```

---

## 🔍 Finding Information

### By Role

#### Developer (Implementation)
1. Start with: [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md)
2. Deep dive: [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md)
3. Visual reference: [SYNC_SYSTEM_DIAGRAMS.md](./SYNC_SYSTEM_DIAGRAMS.md)

#### System Architect (Design)
1. Start with: [SYNC_SYSTEM_DIAGRAMS.md](./SYNC_SYSTEM_DIAGRAMS.md)
2. Architecture details: [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#system-architecture)

#### End User (Operations)
1. Start with: [SYNC_UI_GUIDE.md](./SYNC_UI_GUIDE.md)
2. Troubleshooting: [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#common-issues)

#### QA/Tester (Testing)
1. Testing commands: [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#testing-sync)
2. API endpoints: [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#api-endpoints)

### By Task

#### Adding a New Table to Sync
1. Review: [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#sync-tables-and-dependencies)
2. Update: `src/lib/sync/types.ts` (SYNC_TABLE_MAP, SYNC_FIELD_MAP, SYNC_TABLE_ORDER)
3. Test: [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#testing-sync)

#### Debugging Sync Issues
1. Check: [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#common-issues)
2. Monitor: [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#monitoring)
3. Understand flow: [SYNC_SYSTEM_DIAGRAMS.md](./SYNC_SYSTEM_DIAGRAMS.md#sync-process-flowcharts)

#### Understanding Error Handling
1. Overview: [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#error-handling-and-retry-logic)
2. Visual flow: [SYNC_SYSTEM_DIAGRAMS.md](./SYNC_SYSTEM_DIAGRAMS.md#error-handling-flows)

#### Implementing Sync Feature
1. Code patterns: [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#code-patterns)
2. Implementation: [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#sync-implementation-details)
3. Best practices: [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#best-practices)

---

## 📁 Source Code Files

### Core Sync Files
| File | Purpose | Documentation Reference |
|------|---------|------------------------|
| `src/lib/sync/syncService.ts` | Main sync orchestrator | [Comprehensive Doc - Sync Service Architecture](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#sync-service-architecture) |
| `src/lib/sync/syncProcessor.ts` | Record processor | [Comprehensive Doc - Sync Implementation](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#sync-implementation-details) |
| `src/lib/sync/types.ts` | Type definitions, table mappings | [Quick Reference - Sync Tables](./SYNC_SYSTEM_QUICK_REFERENCE.md#sync-tables) |
| `src/lib/sync/syncValidator.ts` | Data validation | [Comprehensive Doc - Sync Service Architecture](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#sync-service-architecture) |

### API Files
| File | Purpose | Documentation Reference |
|------|---------|------------------------|
| `src/app/api/master/sync/manual/route.ts` | Manual sync endpoint | [Comprehensive Doc - API Endpoints](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#api-endpoints) |
| `src/app/api/master/sync/status/route.ts` | Status endpoint | [Comprehensive Doc - API Endpoints](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#api-endpoints) |
| `src/app/api/master/sync/log/route.ts` | Log endpoint | [Comprehensive Doc - API Endpoints](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md#api-endpoints) |

### UI Files
| File | Purpose | Documentation Reference |
|------|---------|------------------------|
| `src/app/master/sync/page.tsx` | Sync management UI | [UI Guide](./SYNC_UI_GUIDE.md) |

### Legacy Files
| File | Purpose | Notes |
|------|---------|-------|
| `src/services/syncService.ts` | Legacy sync functions | Used for legacy full sync, includes `syncMenuItemTimeEvents` |

---

## 🚀 Getting Started

### For New Developers

1. **Read First**: [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md)
   - Get familiar with tables, API endpoints, and common patterns

2. **Understand Architecture**: [SYNC_SYSTEM_DIAGRAMS.md](./SYNC_SYSTEM_DIAGRAMS.md)
   - Visual understanding of how components interact

3. **Deep Dive**: [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md)
   - Complete technical understanding

4. **Test**: Use examples from [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#testing-sync)

### For System Administrators

1. **UI Guide**: [SYNC_UI_GUIDE.md](./SYNC_UI_GUIDE.md)
   - How to use the sync management interface

2. **Monitoring**: [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#monitoring)
   - SQL queries to monitor sync health

3. **Troubleshooting**: [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#common-issues)
   - Common problems and solutions

---

## 📝 Documentation Maintenance

### When to Update Documentation

- **Adding a new sync table**: Update all 4 documentation files
- **Changing sync logic**: Update comprehensive documentation and diagrams
- **Adding new API endpoint**: Update API sections in all relevant docs
- **Fixing bugs**: Update common issues section if applicable
- **Changing UI**: Update UI guide

### Documentation Standards

- Use clear, concise language
- Include code examples where helpful
- Keep diagrams up to date
- Cross-reference related sections
- Update quick reference for common tasks

---

## 🔗 Related Documentation

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database schema details
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture
- [API_REFERENCE.md](./API_REFERENCE.md) - General API documentation
- [LOCATION_TO_LOCATION_SYNC.md](./LOCATION_TO_LOCATION_SYNC.md) - Location-to-location sync details

---

## 📞 Support

For questions or issues:
1. Check [SYNC_SYSTEM_QUICK_REFERENCE.md](./SYNC_SYSTEM_QUICK_REFERENCE.md#common-issues)
2. Review [SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md](./SYNC_SYSTEM_COMPREHENSIVE_DOCUMENTATION.md)
3. Check source code comments in sync files
4. Review sync logs: `SELECT * FROM sync_log WHERE sync_status = 2`

---

**Last Updated**: January 27, 2026  
**Documentation Version**: 1.0  
**Sync System Version**: Current
