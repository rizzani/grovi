# Audit Logging Implementation

## Overview

This document describes the audit logging system implemented for profile information updates. The system tracks all changes to user profile data (name, email, phone) for security, compliance, and debugging purposes.

## Current Implementation (Option 1: Client-Side Logging)

### Architecture

The current implementation uses **client-side audit logging**, where the mobile app creates audit log entries in Appwrite after each profile update operation.

**Files:**
- `lib/audit-service.ts` - Audit logging service with helper functions
- `app/edit-profile.tsx` - Profile update UI with audit logging
- `app/phone-verification.tsx` - Phone verification with audit logging
- `scripts/setup-database.ts` - Database setup including audit_logs collection

### Event Types Tracked

The following audit events are currently logged:

1. **`profile.name_updated`** - When user updates their full name
   - Metadata: `oldValue`, `newValue`, `field: "name"`

2. **`profile.phone_change_requested`** - When user requests to change phone number
   - Metadata: `oldValue`, `newValue`, `field: "phone"`

3. **`profile.phone_verified`** - When phone number is successfully verified via OTP
   - Metadata: `newValue`, `field: "phone"`

4. **`profile.email_change_requested`** - When user requests to change email
   - Metadata: `oldValue`, `newValue`, `field: "email"`

5. **`profile.email_verified`** - When email is successfully verified
   - **Note:** Currently not implemented. Email verification happens server-side via Appwrite's email verification link. See "Future Improvements" below.

### Database Schema

**Collection:** `audit_logs`

**Attributes:**
- `userId` (string, required) - User ID who performed the action
- `eventType` (string, required) - Type of audit event
- `metadata` (string, optional) - JSON string containing event-specific data
- `timestamp` (string, required) - ISO 8601 timestamp
- `createdAt` (auto-generated) - Appwrite auto-generated timestamp

**Indexes:**
- `idx_userId` - For querying logs by user
- `idx_eventType` - For querying logs by event type
- `idx_timestamp` - For querying logs by time (descending)

### Usage Example

```typescript
import { logNameUpdate } from "../lib/audit-service";

// After successful name update
await logNameUpdate(userId, oldName, newName);
```

### Design Principles

1. **Non-Blocking**: Audit logging failures never break the main application flow
2. **Silent Failures**: Errors are logged to console but don't throw exceptions
3. **Structured Data**: All events follow a consistent format for easy querying
4. **Security**: Document-level permissions ensure users can only create logs for themselves

## Security Considerations

### ⚠️ Important Security Note

**The current client-side audit logging implementation has security limitations:**

1. **Tamper Risk**: Since logs are created by the client, they could potentially be manipulated or skipped
2. **Reliability**: Network issues could cause logs to be lost
3. **Trust**: Client-controlled logs are less trustworthy for security investigations

### Recommended Migration Path

**For production use, migrate to server-side audit logging using one of these approaches:**

#### Option A: Appwrite Functions (Recommended)

Create Appwrite Functions that trigger on profile updates:

1. **Database Webhooks**: Set up webhooks on the `profiles` collection
2. **Function Triggers**: Create functions that automatically log events when documents are updated
3. **Account API Hooks**: Use Appwrite's account update hooks to log email/phone changes

**Benefits:**
- ✅ Server-side execution (tamper-proof)
- ✅ Automatic logging (no client code needed)
- ✅ More reliable (no network dependency)
- ✅ Better security posture

**Implementation Steps:**
1. Create Appwrite Function for profile updates
2. Set up database webhook on `profiles` collection
3. Function receives update events and creates audit logs
4. Remove client-side logging calls (or keep as backup)

#### Option B: Backend API Layer

Create a dedicated backend API that:
- Handles all profile updates
- Logs audit events server-side
- Provides API endpoints for the mobile app

**Benefits:**
- ✅ Full control over logging logic
- ✅ Most secure option
- ✅ Can add additional validation/security

**Trade-offs:**
- Requires building and maintaining a backend service
- More complex architecture

## Future Improvements

### 1. Email Verification Logging

Currently, `profile.email_verified` events are not automatically logged because:
- Email verification happens server-side via Appwrite's email verification link
- The mobile app doesn't directly trigger email verification

**Solutions:**
- **Option 1**: Check verification status periodically and log when status changes
- **Option 2**: Use Appwrite webhooks to detect email verification completion
- **Option 3**: Create Appwrite Function that logs when email verification webhook fires

### 2. Additional Event Types

Consider adding:
- `profile.viewed` - When user views their profile
- `profile.password_changed` - When password is changed (separate feature)
- `profile.deleted` - When account is deleted

### 3. Query Interface

Create utility functions for:
- Querying audit logs by user
- Querying audit logs by event type
- Querying audit logs by date range
- Exporting audit logs for compliance

### 4. Retention Policy

Implement:
- Automatic cleanup of old audit logs (e.g., older than 7 years)
- Archival strategy for compliance requirements
- Compression for long-term storage

### 5. Monitoring & Alerts

Set up:
- Alerts for suspicious patterns (e.g., multiple rapid changes)
- Dashboard for audit log statistics
- Integration with security monitoring tools

## Testing

### Manual Testing Checklist

- [ ] Name update creates `profile.name_updated` log
- [ ] Email change creates `profile.email_change_requested` log
- [ ] Phone change creates `profile.phone_change_requested` log
- [ ] Phone verification creates `profile.phone_verified` log
- [ ] Audit logging failures don't break profile updates
- [ ] Logs are queryable by userId
- [ ] Logs are queryable by eventType
- [ ] Logs are queryable by timestamp

### Database Setup

Run the database setup script to create the audit_logs collection:

```bash
npm run setup-database
```

## Querying Audit Logs

### Example: Get all logs for a user

```typescript
import { databases, databaseId } from "./appwrite-client";
import { Query } from "appwrite";

const logs = await databases.listDocuments(
  databaseId,
  "audit_logs",
  [Query.equal("userId", userId), Query.orderDesc("timestamp")]
);
```

### Example: Get specific event type

```typescript
const nameUpdates = await databases.listDocuments(
  databaseId,
  "audit_logs",
  [
    Query.equal("userId", userId),
    Query.equal("eventType", "profile.name_updated"),
    Query.orderDesc("timestamp")
  ]
);
```

## Migration Checklist

When migrating to server-side logging:

- [ ] Set up Appwrite Functions/webhooks
- [ ] Test server-side logging works correctly
- [ ] Verify all events are being logged
- [ ] Remove or deprecate client-side logging calls
- [ ] Update documentation
- [ ] Monitor for any missed events during transition
- [ ] Keep client-side logging as backup for 30 days
- [ ] Remove client-side logging after verification period

## References

- [Appwrite Functions Documentation](https://appwrite.io/docs/functions)
- [Appwrite Webhooks Documentation](https://appwrite.io/docs/webhooks)
- [Appwrite Database Documentation](https://appwrite.io/docs/databases)

---

**Last Updated:** 2024-01-15  
**Status:** Client-side implementation complete, server-side migration recommended for production
