# Password Management Feature Testing Guide (Version 1.8.0)

## 🎯 Feature Overview

This version adds comprehensive password management capabilities:

1. **User Self-Service**: Users can change their own password
2. **Admin Password Reset**: Admin can reset any user's password to "Alpro@123"
3. **Admin User Edit**: Admin can edit user profiles with optional password update

## 🔐 Testing Scenarios

### Scenario 1: User Changes Own Password

**Steps:**
1. Login as any user (e.g., `admin` / `admin123`)
2. Click the **"Profile"** button in the navigation bar
3. Scroll down to the "Change Password" section
4. Fill in the form:
   - Current Password: `admin123`
   - New Password: `newpass123`
   - Confirm New Password: `newpass123`
5. Click **"Change Password"**

**Expected Result:**
- ✅ Success message: "Password changed successfully!"
- ✅ Form fields are cleared
- ✅ User can logout and login with new password

**Validation Tests:**
- ❌ If passwords don't match → Error: "New passwords do not match"
- ❌ If password < 6 chars → Error: "Password must be at least 6 characters"
- ❌ If current password wrong → Error: "Current password is incorrect"
- ❌ If new = current → Error: "New password must be different from current password"

### Scenario 2: Admin Resets User Password

**Steps:**
1. Login as admin (`admin` / `admin123`)
2. Navigate to **"User Management"**
3. Find any user in the list
4. Click the **purple key icon** (Reset Password button)
5. Confirm the action

**Expected Result:**
- ✅ Confirmation dialog: "Reset this user's password to 'Alpro@123'?"
- ✅ Success message: "Password reset to Alpro@123"
- ✅ User can now login with password: `Alpro@123`

### Scenario 3: Admin Edits User (Without Changing Password)

**Steps:**
1. Login as admin
2. Navigate to **"User Management"**
3. Click the **blue edit icon** for any user
4. Modify some fields (e.g., Full Name, Role)
5. **Leave the password field EMPTY**
6. Click **"Save Changes"**

**Expected Result:**
- ✅ User details are updated
- ✅ User's password remains unchanged
- ✅ User can still login with their old password

### Scenario 4: Admin Edits User (With Password Change)

**Steps:**
1. Login as admin
2. Navigate to **"User Management"**
3. Click the **blue edit icon** for any user
4. Modify some fields
5. **Enter a new password** in the password field
6. Click **"Save Changes"**

**Expected Result:**
- ✅ User details and password are updated
- ✅ User must login with the new password

## 📱 UI Components Added

### Profile Page
- **Location**: New navigation button "Profile" in navbar
- **Sections**:
  - Profile Information (read-only)
    - Username
    - Full Name
    - Role
    - Outlet Code (if applicable)
  - Change Password Form
    - Current Password (required)
    - New Password (required, min 6 chars)
    - Confirm New Password (required)

### Admin User Management Enhancements
- **Edit Button** (blue): Opens modal to edit user details
- **Reset Password Button** (purple key icon): Resets password to "Alpro@123"

## 🔧 API Endpoints

### 1. Change Own Password
```
POST /api/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "current_password": "oldpass",
  "new_password": "newpass123"
}
```

**Responses:**
- `200 OK`: Password changed successfully
- `400 Bad Request`: Validation error (missing fields, password too short)
- `401 Unauthorized`: Current password incorrect
- `404 Not Found`: User not found

### 2. Admin Reset Password
```
POST /api/admin/reset-password/:userId
Authorization: Bearer {admin-token}
```

**Responses:**
- `200 OK`: Password reset to "Alpro@123"
- `403 Forbidden`: Not an admin
- `500 Internal Server Error`: Database error

### 3. Get Single User
```
GET /api/admin/users/:userId
Authorization: Bearer {admin-token}
```

**Responses:**
- `200 OK`: Returns user object
- `403 Forbidden`: Not an admin
- `404 Not Found`: User not found

### 4. Update User (Modified)
```
PATCH /api/admin/users/:userId
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "username": "newusername",
  "full_name": "New Name",
  "role": "outlet",
  "outlet_code": "A001",
  "password": "newpass"  // Optional - omit to keep unchanged
}
```

**Responses:**
- `200 OK`: User updated
- `403 Forbidden`: Not an admin
- `500 Internal Server Error`: Database error

## ⚠️ Security Notes

**Current Implementation** (Development):
- Passwords are stored in plain text in `password_hash` column
- Simple string comparison for password verification
- No bcrypt hashing (yet)

**Production Recommendations**:
1. Implement bcrypt password hashing
2. Add password complexity requirements
3. Implement password history (prevent reuse)
4. Add rate limiting for password change attempts
5. Send email notifications on password changes
6. Require re-authentication for sensitive operations

## 🧪 Quick Test Commands

```bash
# Test user password change
curl -X POST http://localhost:3000/api/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"current_password":"admin123","new_password":"newpass123"}'

# Test admin password reset (replace USER_ID)
curl -X POST http://localhost:3000/api/admin/reset-password/USER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Test get single user
curl -X GET http://localhost:3000/api/admin/users/USER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Test update user without password
curl -X PATCH http://localhost:3000/api/admin/users/USER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","full_name":"Test User","role":"outlet","outlet_code":"A001"}'

# Test update user with password
curl -X PATCH http://localhost:3000/api/admin/users/USER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","full_name":"Test User","role":"outlet","outlet_code":"A001","password":"newpass123"}'
```

## 📝 Version History

- **Version 1.8.0** (Current): Password management feature
- **Version 1.7.0**: Multi-day dashboard with delivery date planning
- **Version 1.6.0**: Warehouse-style outlet bulk completion
- **Version 1.5.0**: Dashboard delivered outlets tracking

## 🌐 Application URL

**Development**: https://3000-i8ezurtfnv7jlbrg994fh-02b9cc79.sandbox.novita.ai

## ✅ Testing Checklist

- [ ] User can view profile information
- [ ] User can change own password successfully
- [ ] Password validation works correctly
- [ ] Current password verification works
- [ ] Admin can reset user password to "Alpro@123"
- [ ] Admin can edit user without changing password
- [ ] Admin can edit user and change password
- [ ] Password field in edit modal is truly optional
- [ ] All error messages display correctly
- [ ] Success toasts appear after operations
- [ ] User list refreshes after operations

---

**Next Steps**: Test all scenarios and verify the password management functionality works as expected!
