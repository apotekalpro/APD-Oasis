# Setting Up GitHub → Cloudflare Automatic Deployment

## Current Status
✅ GitHub: https://github.com/apotekalpro/APD-Oasis (code stored)
✅ Cloudflare: https://apd-oasis.pages.dev (app running)

## Problem
Right now they're separate. You need to:
1. Push to GitHub
2. Manually deploy to Cloudflare

## Solution: Connect Them!

### Step-by-Step Guide

#### 1. Open Cloudflare Dashboard
Visit: https://dash.cloudflare.com/

#### 2. Navigate to Your Project
- Click "Workers & Pages" in left menu
- Find "apd-oasis" project
- Click on it

#### 3. Connect to GitHub
- Click "Settings" tab at the top
- Scroll down to "Builds & deployments" section
- Click "Connect to Git" button
- Click "Connect GitHub"

#### 4. Authorize Cloudflare
- Cloudflare will ask permission to access your GitHub
- Click "Authorize Cloudflare Pages"
- You may need to select which repositories to allow

#### 5. Select Repository
- Search for: APD-Oasis
- Select: apotekalpro/APD-Oasis
- Click "Begin setup"

#### 6. Configure Build Settings
```
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: (leave empty)
```

#### 7. Environment Variables
Already configured! No action needed:
- SUPABASE_URL ✅
- SUPABASE_ANON_KEY ✅
- SUPABASE_SERVICE_KEY ✅
- JWT_SECRET ✅

#### 8. Save & Deploy
Click "Save and Deploy"

---

## After Setup - How It Works

### Old Way (Manual):
```bash
git add .
git commit -m "update"
git push origin main        # Push to GitHub
npm run build              # Build locally
wrangler pages deploy dist # Deploy to Cloudflare
```

### New Way (Automatic):
```bash
git add .
git commit -m "update"
git push origin main       # That's it! Auto-deploys!
```

---

## Benefits of GitHub Integration

✅ **Automatic Deployments**
- Every push to main = automatic deploy
- No manual commands needed

✅ **Preview Deployments**
- Pull requests get their own preview URLs
- Test before merging to main

✅ **Deployment History**
- See all deployments in Cloudflare dashboard
- Rollback to any previous version with one click

✅ **Build Logs**
- See what happened during build
- Debug build failures easily

✅ **Branch Deployments**
- Deploy different branches automatically
- dev branch → dev.apd-oasis.pages.dev
- staging branch → staging.apd-oasis.pages.dev

---

## What You Get

### Current URLs (will stay the same):
- **Production**: https://apd-oasis.pages.dev
- **GitHub**: https://github.com/apotekalpro/APD-Oasis

### After connecting:
- Same URLs
- BUT: Just push to GitHub and it auto-deploys!

---

## FAQs

**Q: Will my current deployment be affected?**
A: No, it keeps running. GitHub connection just adds automatic deployments.

**Q: Can I still deploy manually?**
A: Yes! You can use both methods.

**Q: What if I push broken code?**
A: You can rollback to previous deployment in Cloudflare dashboard.

**Q: Does it cost more?**
A: No, same free tier.

---

## Summary

**What you have now**:
- GitHub (code) ← Manual push
- Cloudflare (app) ← Manual deploy

**What you'll have after connecting**:
- GitHub (code) ← Push here
  ↓ (automatic)
- Cloudflare (app) ← Auto-deploys!

**Your action**: Follow steps 1-8 above to connect them!

---

**Last Updated**: November 15, 2025
**Status**: Ready to connect
