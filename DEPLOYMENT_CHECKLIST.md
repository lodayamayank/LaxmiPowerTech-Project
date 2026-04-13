# 🚀 DEPLOYMENT CHECKLIST

## ⚡ QUICK START (Before Deployment)

```bash
# Run the cleanup script
./cleanup-production.sh

# Test locally
npm run preview

# If all good, deploy!
```

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 🔧 Code Cleanup
- [ ] Run `./cleanup-production.sh`
- [ ] Verify no console.logs remain: `grep -r "console.log" src/`
- [ ] Check no backup files: `find src -name "*Backup*" -o -name "*Old*"`
- [ ] Verify build passes: `npm run build`

### 🔐 Environment Variables
- [ ] `.env` file configured with production URLs
- [ ] `.env.example` created and committed
- [ ] No hardcoded localhost URLs
- [ ] API base URL points to production backend

### 🧪 Testing
- [ ] Test login flow
- [ ] Test all major pages (Dashboard, Projects, Attendance, etc.)
- [ ] Test mobile responsiveness
- [ ] Test API integration
- [ ] Test file uploads
- [ ] Test authentication/authorization

### 📦 Dependencies
- [ ] No unused dependencies
- [ ] All dependencies up to date (or intentionally pinned)
- [ ] `package-lock.json` committed

### 🔒 Security
- [ ] No sensitive data in code
- [ ] Environment variables used for secrets
- [ ] CORS configured correctly
- [ ] Authentication working

---

## 🌐 DEPLOYMENT STEPS

### Option 1: Vercel (Recommended for Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# For production
vercel --prod
```

**Environment Variables to Set in Vercel:**
- `VITE_API_BASE_URL` = Your backend URL

### Option 2: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# For production
netlify deploy --prod
```

### Option 3: Manual Build + Upload

```bash
# Build
npm run build

# Upload dist/ folder to your hosting
```

---

## 🔍 POST-DEPLOYMENT VERIFICATION

### Immediate Checks (First 5 minutes)
- [ ] Site loads without errors
- [ ] Login works
- [ ] Dashboard displays correctly
- [ ] API calls succeed
- [ ] No console errors in browser

### Thorough Testing (First hour)
- [ ] Test all major user flows
- [ ] Check mobile/tablet views
- [ ] Verify all pages load
- [ ] Test file uploads
- [ ] Check data persistence
- [ ] Verify authentication timeout
- [ ] Test logout

### Monitoring (First 24 hours)
- [ ] Check error rates
- [ ] Monitor API response times
- [ ] Watch for user reports
- [ ] Check server logs
- [ ] Monitor database performance

---

## 🚨 ROLLBACK PLAN

If something goes wrong:

### Quick Rollback (Vercel/Netlify)
```bash
# Vercel
vercel rollback

# Netlify
netlify rollback
```

### Manual Rollback
1. Revert to previous commit
2. Rebuild: `npm run build`
3. Redeploy

---

## 📊 PERFORMANCE CHECKLIST

- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3s
- [ ] Bundle size < 5MB
- [ ] No memory leaks

---

## 🎯 SUCCESS CRITERIA

✅ **Ready to Deploy When:**
- All checklist items completed
- Build passes without errors
- Local testing successful
- Environment variables configured
- No console.logs in production
- Backup/old files removed

❌ **DO NOT Deploy If:**
- Build fails
- Console.logs present
- Hardcoded localhost URLs
- Environment variables missing
- Critical bugs found in testing

---

## 📞 EMERGENCY CONTACTS

**If deployment fails:**
1. Check browser console for errors
2. Check network tab for failed API calls
3. Verify environment variables
4. Check backend logs
5. Rollback if necessary

---

## 🎉 POST-LAUNCH TODO

### Week 1
- [ ] Set up error tracking (Sentry)
- [ ] Add analytics (Google Analytics/Mixpanel)
- [ ] Monitor performance
- [ ] Gather user feedback
- [ ] Fix any reported bugs

### Month 1
- [ ] Add automated tests
- [ ] Optimize performance
- [ ] Add missing features
- [ ] Improve error handling
- [ ] Add monitoring dashboards

---

**Last Updated:** April 13, 2026  
**Version:** 1.0
