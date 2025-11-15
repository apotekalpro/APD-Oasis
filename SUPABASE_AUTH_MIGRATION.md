# Supabase Authentication & Auto-Cleanup Implementation Plan

## Overview

Moving from JWT-based authentication to Supabase Auth with enhanced role permissions and automatic data cleanup.

---

## 🔐 Authentication Changes

### Current System (JWT)
- ❌ Custom JWT tokens stored in local backend
- ❌ Password hashes in database
- ❌ Manual token management

### New System (Supabase Auth)
- ✅ Supabase Auth for authentication
- ✅ Secure user management through Supabase
- ✅ Built-in session management
- ✅ Email verification support (optional)

---

## 👥 Role System Changes

### Current Roles
1. `admin` - Full access
2. `warehouse` - Import, loading, **CAN DELETE** ❌
3. `driver` - Loading, unloading
4. `outlet` - Unloading only

### New Roles
1. `admin` - Full access, **CAN DELETE** ✅
2. `warehouse_supervisor` - **NEW!** Full warehouse access, **CAN DELETE** ✅
3. `warehouse` - Import, loading, **CANNOT DELETE** ✅
4. `driver` - Loading, unloading, **CANNOT DELETE** ✅
5. `outlet` - Unloading only, **CANNOT DELETE** ✅

---

## 🔒 Permission Matrix

| Action | Admin | Supervisor | Warehouse | Driver | Outlet |
|--------|-------|------------|-----------|--------|--------|
| **Authentication** |
| Login | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change Password | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Data Import** |
| Import Excel | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Scanning Operations** |
| Warehouse Loading | ✅ | ✅ | ✅ | ✅ | ❌ |
| Outlet Unloading | ✅ | ✅ | ✅ | ✅ | ✅ (own only) |
| **Data Management** |
| Delete Transfers | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Outlets | ✅ | ✅ | ❌ | ❌ | ❌ |
| Amend Records | ✅ | ✅ | ❌ | ❌ | ❌ |
| **User Management** |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Outlets | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Reports** |
| View Reports | ✅ | ✅ | ✅ | ✅ | ✅ (own only) |
| Export Reports | ✅ | ✅ | ✅ | ✅ | ✅ (own only) |

---

## 🗄️ Database Schema Updates

### 1. Update users table
```sql
-- Add warehouse_supervisor role
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'warehouse_supervisor', 'warehouse', 'driver', 'outlet'));

-- Add Supabase Auth ID column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);

-- Add index for faster auth lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
```

### 2. Create auto-cleanup function
```sql
-- Function to delete records older than 3 months
CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS void AS $$
BEGIN
    -- Delete old transfer_details (3 months old)
    DELETE FROM transfer_details
    WHERE created_at < NOW() - INTERVAL '3 months';
    
    -- Delete old parcels (3 months old)
    DELETE FROM parcels
    WHERE created_at < NOW() - INTERVAL '3 months';
    
    -- Delete old error_parcels (3 months old)
    DELETE FROM error_parcels
    WHERE created_at < NOW() - INTERVAL '3 months';
    
    -- Delete old imports (3 months old)
    DELETE FROM imports
    WHERE created_at < NOW() - INTERVAL '3 months';
    
    -- Delete old audit_logs (3 months old)
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '3 months';
    
    RAISE NOTICE 'Cleanup completed: Records older than 3 months deleted';
END;
$$ LANGUAGE plpgsql;
```

### 3. Create scheduled cleanup job
```sql
-- Schedule cleanup to run daily at 2 AM
-- Note: This requires pg_cron extension in Supabase
SELECT cron.schedule(
    'cleanup-old-records',
    '0 2 * * *',  -- Every day at 2 AM
    $$ SELECT cleanup_old_records(); $$
);
```

### 4. Add soft delete support (optional)
```sql
-- Add deleted_at column for soft deletes (optional feature)
ALTER TABLE transfer_details ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
```

---

## 🔌 Backend API Changes

### Authentication Endpoints

#### OLD (JWT):
```typescript
POST /api/login
- Takes username, password
- Returns JWT token
- Stores nothing in Supabase
```

#### NEW (Supabase Auth):
```typescript
POST /api/auth/login
- Takes username (email), password
- Calls Supabase Auth signInWithPassword
- Returns Supabase session
- Session stored in Supabase

POST /api/auth/signup
- Admin/Supervisor only
- Creates user in Supabase Auth
- Links to users table

POST /api/auth/logout
- Calls Supabase Auth signOut
- Clears session

GET /api/auth/session
- Validates current session
- Returns user info with role
```

### Permission Checks

#### OLD:
```typescript
// Any warehouse or admin can delete
if (!['admin', 'warehouse'].includes(user.role)) {
  return c.json({ error: 'Forbidden' }, 403)
}
```

#### NEW:
```typescript
// Only admin and supervisor can delete
if (!['admin', 'warehouse_supervisor'].includes(user.role)) {
  return c.json({ error: 'Only supervisors and admins can delete records' }, 403)
}
```

---

## 🎨 Frontend Changes

### Login Screen
```javascript
// OLD: Custom JWT login
const response = await axios.post('/api/login', { username, password })
localStorage.setItem('token', response.data.token)

// NEW: Supabase Auth login
const response = await axios.post('/api/auth/login', { username, password })
// Session managed by Supabase automatically
```

### Permission-Based UI
```javascript
// Hide delete buttons for warehouse role
function canDelete() {
    return ['admin', 'warehouse_supervisor'].includes(state.user.role)
}

// In warehouse page:
${canDelete() ? `
    <button onclick="confirmDeleteOutlet('${outlet.code}')">
        <i class="fas fa-trash"></i>Delete All
    </button>
` : ''}
```

---

## 📋 Implementation Steps

### Phase 1: Database Setup
1. ✅ Update users table with new role constraint
2. ✅ Add auth_id column for Supabase Auth linkage
3. ✅ Create cleanup_old_records() function
4. ✅ Enable pg_cron extension (if available)
5. ✅ Schedule daily cleanup job

### Phase 2: Backend Migration
1. ✅ Install Supabase Auth SDK
2. ✅ Create new auth routes
3. ✅ Update authMiddleware to use Supabase session
4. ✅ Update all delete endpoints with supervisor check
5. ✅ Test authentication flow

### Phase 3: Frontend Migration
1. ✅ Update login component
2. ✅ Update session management
3. ✅ Add permission-based UI rendering
4. ✅ Hide delete buttons for warehouse role
5. ✅ Test all user flows

### Phase 4: Data Migration
1. ✅ Create Supabase Auth users for existing accounts
2. ✅ Link auth_id to users table
3. ✅ Test all user logins

### Phase 5: Testing
1. ✅ Test admin login and permissions
2. ✅ Test supervisor login and delete access
3. ✅ Test warehouse login and NO delete access
4. ✅ Test outlet logins
5. ✅ Verify auto-cleanup function

---

## 🚀 Migration Script

### Create Supabase Auth Users
```sql
-- This will be done through Supabase dashboard or API
-- For each existing user:
-- 1. Create auth.users entry
-- 2. Link to users.auth_id
-- 3. Set email as username@apdoasis.local
```

### Update Existing Users
```sql
-- Add warehouse_supervisor accounts
INSERT INTO users (username, auth_id, full_name, role, is_active)
VALUES 
    ('supervisor1', 'auth-uuid-here', 'Warehouse Supervisor 1', 'warehouse_supervisor', true),
    ('supervisor2', 'auth-uuid-here', 'Warehouse Supervisor 2', 'warehouse_supervisor', true);
```

---

## 🧪 Testing Checklist

### Authentication Tests
- [ ] Admin can login
- [ ] Supervisor can login
- [ ] Warehouse can login
- [ ] Outlet can login
- [ ] Invalid credentials rejected
- [ ] Session persists across page refresh
- [ ] Logout clears session

### Permission Tests
- [ ] Admin can delete transfers
- [ ] Supervisor can delete transfers
- [ ] Warehouse CANNOT delete transfers (403 error)
- [ ] Warehouse can still import and scan
- [ ] Delete buttons hidden for warehouse role
- [ ] All roles can view their allowed pages

### Data Cleanup Tests
- [ ] cleanup_old_records() function exists
- [ ] Function deletes records > 3 months
- [ ] Function preserves recent records
- [ ] Scheduled job configured
- [ ] Test manual execution

---

## ⚠️ Important Notes

### Supabase Auth Setup Required
1. Enable Email Auth in Supabase dashboard
2. Configure email templates (optional)
3. Set site URL for redirects
4. Enable Row Level Security (RLS) policies

### Data Retention
- ✅ **3 months**: Automatically deleted
- ✅ **Audit logs**: Included in cleanup
- ✅ **User accounts**: Never deleted automatically
- ✅ **Outlet data**: Never deleted automatically

### Backward Compatibility
- Keep old JWT login endpoint for transition period
- Add deprecation notice
- Remove after all users migrated

---

## 📊 Benefits

### Security
✅ Industry-standard Supabase Auth  
✅ Proper password hashing  
✅ Session management  
✅ Email verification support  

### Permissions
✅ Clear role hierarchy  
✅ Supervisor role for management  
✅ Warehouse cannot delete/amend  
✅ Better access control  

### Data Management
✅ Automatic 3-month cleanup  
✅ Reduced database size  
✅ Improved performance  
✅ Compliance-ready  

---

## 🔄 Rollback Plan

If issues occur:
1. Disable auto-cleanup job
2. Re-enable JWT authentication
3. Restore users table backup
4. Notify all users

---

**Implementation Priority**: HIGH  
**Estimated Time**: 3-4 hours  
**Risk Level**: Medium (involves authentication changes)  
**Backup Required**: YES (users table, auth.users)
