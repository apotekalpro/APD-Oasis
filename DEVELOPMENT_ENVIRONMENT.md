# 🔧 APD OASIS - Development Environment Setup

## ✅ PRODUCTION BACKUP COMPLETED (22 July 2026)

### 📦 What Was Backed Up:
- **Git Branch**: `backup-22072026-production` ✅ [Pushed to GitHub](https://github.com/apotekalpro/APD-Oasis/tree/backup-22072026-production)
- **Git Tag**: `v1.1.30m-production-22072026` ✅ [Pushed to GitHub](https://github.com/apotekalpro/APD-Oasis/releases/tag/v1.1.30m-production-22072026)
- **Project Archive**: `APD-OASIS-BACKUP-22072026.tar.gz` (724 MB) ✅ [Download Link](https://www.genspark.ai/api/files/s/wU4gVyrO)
- **Production APK**: `APD-OASIS-PRODUCTION-22072026-v1.1.30m.apk` (3.4M) ✅ Saved locally
- **Supabase Database**: ⚠️ **YOU NEED TO DO THIS MANUALLY**

---

## 🔴 CRITICAL: BACKUP SUPABASE DATABASE NOW

**YOU MUST DO THIS STEP YOURSELF:**

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your **APD OASIS Production Project**
3. Click **"Database"** → **"Backups"** (or **"Settings"** → **"Database"**)
4. Click **"Create Manual Backup"** or **"Export Database"**
5. Name it: **`PRODUCTION-22072026-v1.1.30m`**
6. Download the backup file (.sql or .dump format)
7. Store it safely alongside the project backup

**Why This Is Critical:**
- Current production database contains live container/pallet data
- Development environment will use SEPARATE database
- This backup allows rollback if anything goes wrong
- **DO THIS BEFORE PROCEEDING WITH DEVELOPMENT**

---

## 🚀 DEVELOPMENT ENVIRONMENT (Isolated Testing)

### 📍 Current Branch Structure:

| Branch | Purpose | Status |
|--------|---------|--------|
| `main` | Production (live app/web) | ✅ Protected, working v1.1.30m |
| `backup-22072026-production` | Snapshot backup | ✅ Created & pushed to GitHub |
| `development` | Development/testing | ✅ Created & pushed to GitHub |

### 🌍 Environment Separation Strategy:

You now have TWO separate environments:

| Environment | Branch | Cloudflare Project | Supabase Database | Purpose |
|-------------|--------|-------------------|-------------------|---------|
| **PRODUCTION** | `main` | `apd-oasis` | Production DB | Live app (don't touch!) |
| **DEVELOPMENT** | `development` | `apd-oasis-dev` | Development DB | Testing upgrades |

---

## 🛠️ NEXT STEPS TO SET UP DEVELOPMENT ENVIRONMENT

### STEP 1: Create Development Cloudflare Project

```bash
cd /home/user/flutter_app
git checkout development

# Deploy to NEW Cloudflare project (development)
npx wrangler pages project create apd-oasis-dev

# Deploy development environment
npx wrangler pages deploy dist --project-name=apd-oasis-dev
```

**Result**: You'll get a development URL like:
- https://apd-oasis-dev.pages.dev (dev environment)
- https://apd-oasis.pages.dev (production - unchanged)

### STEP 2: Create Development Supabase Database

**Manual Setup Required:**

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Click **"New Project"**
3. Name: **"APD OASIS Development"**
4. Organization: Same as production
5. Database Password: Create a NEW password (different from production)
6. Region: Same as production
7. Click **"Create New Project"**

**Wait for project to be created** (takes 2-3 minutes)

### STEP 3: Copy Database Schema to Development

**After development database is created:**

1. In **Production** Supabase project:
   - Go to **"SQL Editor"**
   - Click **"New Query"**
   - Run: `pg_dump -s` (schema only, no data)
   - Copy the output

2. In **Development** Supabase project:
   - Go to **"SQL Editor"**
   - Paste the schema SQL
   - Execute to create tables

**Or use Migration Files** (recommended):

```sql
-- Run these in Development Supabase SQL Editor
-- Copy from production migrations or use your existing schema
```

### STEP 4: Configure Development Environment Variables

Create `.env.development` file:

```bash
cd /home/user/flutter_app
cat > .env.development << 'EOF'
# Development Environment Configuration
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_ANON_KEY=your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-key
CLOUDFLARE_PROJECT=apd-oasis-dev
ENVIRONMENT=development
EOF
```

Update `vite.config.ts` to detect environment:

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  // ... existing config
  define: {
    'process.env.ENVIRONMENT': JSON.stringify(process.env.ENVIRONMENT || 'production')
  }
})
```

### STEP 5: Update Code to Use Environment-Specific Configuration

Create `src/config.ts`:

```typescript
// Environment detection
const isDevelopment = window.location.hostname.includes('apd-oasis-dev') || 
                      process.env.ENVIRONMENT === 'development'

export const config = {
  supabaseUrl: isDevelopment 
    ? 'https://your-dev-project.supabase.co'  // Development Supabase
    : 'https://your-prod-project.supabase.co', // Production Supabase
  
  supabaseAnonKey: isDevelopment
    ? 'your-dev-anon-key'
    : 'your-prod-anon-key',
  
  environment: isDevelopment ? 'development' : 'production'
}

console.log(`🌍 Running in ${config.environment} environment`)
```

Update `src/index.tsx` to use config:

```typescript
import { config } from './config'

// Use config.supabaseUrl instead of hardcoded URL
```

---

## 🔄 SAFE DEVELOPMENT WORKFLOW

### Phase 1: Work on Development Branch

```bash
# Always work on development branch
git checkout development

# Make your changes, test, commit
git add .
git commit -m "New feature: describe changes"
git push origin development

# Deploy to DEVELOPMENT Cloudflare project
npx wrangler pages deploy dist --project-name=apd-oasis-dev
```

**Test on**: https://apd-oasis-dev.pages.dev
- Uses development Supabase database
- No impact on production

### Phase 2: Test Thoroughly

**Test checklist before merging:**
- [ ] All existing features still work
- [ ] New features work correctly
- [ ] No database errors
- [ ] Mobile app works (build APK from development branch)
- [ ] No breaking changes

### Phase 3: Merge to Production (ONLY WHEN CONFIRMED)

```bash
# After thorough testing, merge to main
git checkout main
git merge development

# Deploy to PRODUCTION
npx wrangler pages deploy dist --project-name=apd-oasis

# Build production APK
cd android && ./gradlew clean assembleRelease
```

---

## 🛡️ SAFETY RULES

### ✅ ALWAYS DO:
- Work on `development` branch
- Test on `apd-oasis-dev` Cloudflare project
- Use development Supabase database for testing
- Create backups before major changes
- Test thoroughly before merging to main

### ❌ NEVER DO:
- Don't modify `main` branch directly
- Don't deploy to `apd-oasis` production project until confirmed
- Don't test on production Supabase database
- Don't merge unfinished features to main
- Don't skip testing steps

---

## 🔙 ROLLBACK PROCEDURE (If Something Goes Wrong)

### Option 1: Rollback Git

```bash
# Restore from backup branch
git checkout main
git reset --hard backup-22072026-production
git push origin main --force

# Or restore from tag
git checkout v1.1.30m-production-22072026
git checkout -b main-restored
git push origin main-restored
```

### Option 2: Rollback Cloudflare Deployment

```bash
# Redeploy from backup branch
git checkout backup-22072026-production
npm run build
npx wrangler pages deploy dist --project-name=apd-oasis
```

### Option 3: Rollback Supabase Database

1. Go to Supabase Dashboard
2. Navigate to **Database → Backups**
3. Select **`PRODUCTION-22072026-v1.1.30m`** backup
4. Click **"Restore"**

### Option 4: Restore Full Project from Archive

1. Download: https://www.genspark.ai/api/files/s/wU4gVyrO
2. Extract: `tar -xzf APD-OASIS-BACKUP-22072026.tar.gz`
3. Follow deployment steps to restore production

---

## 📊 ENVIRONMENT COMPARISON

| Aspect | Production | Development |
|--------|-----------|-------------|
| **Git Branch** | `main` | `development` |
| **Cloudflare Project** | `apd-oasis` | `apd-oasis-dev` |
| **Web URL** | https://apd-oasis.pages.dev | https://apd-oasis-dev.pages.dev |
| **Supabase Database** | Production DB | Development DB (separate) |
| **Data** | Live customer data | Test data only |
| **Changes** | Protected, no direct changes | Free to experiment |
| **Testing** | No testing here! | All testing here |

---

## 🎯 QUICK REFERENCE

### Start Development Session:
```bash
cd /home/user/flutter_app
git checkout development
git pull origin development
# Make changes, test, commit
```

### Deploy Development Version:
```bash
npm run build
npx wrangler pages deploy dist --project-name=apd-oasis-dev
```

### Deploy to Production (AFTER CONFIRMATION):
```bash
git checkout main
git merge development
npm run build
npx wrangler pages deploy dist --project-name=apd-oasis
cd android && ./gradlew clean assembleRelease
```

---

## ✅ BACKUP VERIFICATION

**Production Backup - 22 July 2026:**
- ✅ Git branch: `backup-22072026-production` (GitHub)
- ✅ Git tag: `v1.1.30m-production-22072026` (GitHub)
- ✅ Project archive: Download link above
- ✅ APK backup: `APD-OASIS-PRODUCTION-22072026-v1.1.30m.apk`
- ⚠️ Supabase backup: **YOU MUST DO THIS MANUALLY** (see instructions above)

**Current Working Version:**
- Version: v1.1.30m (commit 8b8c29c)
- Status: All container status bugs fixed
- Production URL: https://apd-oasis.pages.dev
- APK: APD-OASIS-LATEST.apk (3.4M)

---

## 📞 NEXT ACTIONS FOR YOU

1. **CRITICAL**: Backup your Supabase production database manually (see instructions above)
2. **Create Development Cloudflare Project**: Run Step 1 commands
3. **Create Development Supabase Database**: Follow Step 2 manual setup
4. **Configure Environment Variables**: Follow Step 4
5. **Update Code for Environment Detection**: Follow Step 5
6. **Test Development Environment**: Make a small change and deploy to dev
7. **Confirm Everything Works**: Only then proceed with upgrades

**Once development environment is set up, you can freely test upgrades without affecting production!**
