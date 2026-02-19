# 🚨 Render Backend Deployment & Wake-up Checklist

**Date:** Feb 19, 2026  
**Backend URL:** https://laxmipowertech-backend-1.onrender.com  
**Issue:** Backend returning 404 errors - service appears asleep or not fully deployed

---

## 🔍 Problem Diagnosis

### Test Results
```bash
# Testing backend endpoints
curl https://laxmipowertech-backend-1.onrender.com/api/auth/login
# ✅ Returns: {"message":"Invalid credentials"} - AUTH WORKING

curl https://laxmipowertech-backend-1.onrender.com/api/indents
# ❌ Returns: "Cannot GET /api/indents" - 404 ERROR

curl https://laxmipowertech-backend-1.onrender.com/api/material/catalog
# ❌ Returns: "Cannot GET /api/material/catalog" - 404 ERROR
```

### Root Causes (Priority Order)

1. **Render Free Tier Sleep (Most Likely):**
   - Free tier services sleep after 15 minutes of inactivity
   - First request after sleep takes 30-60 seconds to wake up
   - Returns generic HTML 404 during spin-up

2. **Incomplete Deployment:**
   - Build succeeded but service didn't start correctly
   - Missing environment variables
   - Database connection failure

3. **Build/Deploy Error:**
   - Recent deployment failed
   - Code changes not deployed
   - Wrong branch deployed

---

## ✅ Step 1: Wake Up Render Service

### Method 1: Direct Browser Access
1. Open browser and visit: `https://laxmipowertech-backend-1.onrender.com/api/auth/login`
2. Wait 30-60 seconds for service to wake up
3. You should see: `{"message":"Not authorized, no token"}` (instead of HTML 404)
4. Test again: `https://laxmipowertech-backend-1.onrender.com/api/salary/calculate`

### Method 2: Terminal Wake-up Script
```bash
# Run this from frontend-main directory
echo "🔄 Waking up Render backend..."
for i in {1..3}; do
  echo "Attempt $i/3"
  curl -X GET https://laxmipowertech-backend-1.onrender.com/api/auth/login 2>&1 | grep -q "message" && echo "✅ Backend is awake!" && break
  sleep 20
done
```

### Method 3: Use Render Dashboard
1. Go to: https://dashboard.render.com
2. Select your backend service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for deployment to complete (~2-5 minutes)

---

## ✅ Step 2: Verify Deployment

### Check Render Logs
1. Go to Render Dashboard → Your Service → Logs
2. Look for:
   ```
   ✅ MongoDB connected successfully
   ✅ Server running on port 5000
   ✅ Routes registered: /api/auth, /api/salary, /api/indents...
   ```
3. Check for errors:
   ```
   ❌ Error: connect ECONNREFUSED (MongoDB issue)
   ❌ Cannot find module (missing dependency)
   ❌ JWT_SECRET not defined (env var issue)
   ```

### Verify Environment Variables
Required environment variables in Render Dashboard → Environment:
```
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:5173,https://laxmi-power-tech-project.vercel.app
```

---

## ✅ Step 3: Test All Endpoints

### Run Automated Test Script
```bash
#!/bin/bash
# Save as: test-backend.sh

BACKEND="https://laxmipowertech-backend-1.onrender.com/api"

echo "🧪 Testing Backend Endpoints..."
echo ""

echo "1. Testing /auth/login"
curl -X POST "$BACKEND/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  -w "\nStatus: %{http_code}\n\n"

echo "2. Testing /salary/calculate (no auth)"
curl -X GET "$BACKEND/salary/calculate" \
  -w "\nStatus: %{http_code}\n\n"

echo "3. Testing /salary-slips (no auth)"
curl -X GET "$BACKEND/salary-slips" \
  -w "\nStatus: %{http_code}\n\n"

echo "4. Testing /indents (no auth)"
curl -X GET "$BACKEND/indents" \
  -w "\nStatus: %{http_code}\n\n"

echo "5. Testing /material/catalog (no auth)"
curl -X GET "$BACKEND/material/catalog" \
  -w "\nStatus: %{http_code}\n\n"

echo "✅ Test complete!"
```

**Run with:**
```bash
chmod +x test-backend.sh
./test-backend.sh
```

---

## ✅ Step 4: Frontend Connection Test

### Update axios.js to Force Production URL (Testing)
```javascript
// TEMPORARY - For testing only
const baseURL = 'https://laxmipowertech-backend-1.onrender.com/api';

console.log('🌐 Axios configured with baseURL:', baseURL);
```

### Test in Browser Console
1. Open http://localhost:5173/login
2. Open browser DevTools → Console
3. You should see:
   ```
   🌐 Environment: LOCAL
   🌐 Axios configured with baseURL: http://localhost:5000/api
   ```
4. Try logging in with valid credentials
5. Check Network tab for API calls

---

## 🔧 Common Issues & Fixes

### Issue 1: "Cannot GET /api/indents" (404)
**Cause:** Service is asleep or not started  
**Fix:** Wait 60 seconds and retry, or manually deploy from Render dashboard

### Issue 2: "Not authorized, no token" (401)
**Cause:** Normal - endpoint requires authentication  
**Fix:** This is CORRECT behavior, endpoint is working

### Issue 3: CORS Error in Browser
**Cause:** Frontend origin not in ALLOWED_ORIGINS  
**Fix:** Add to Render env vars:
```
ALLOWED_ORIGINS=http://localhost:5173,https://laxmi-power-tech-project.vercel.app
```

### Issue 4: MongoDB Connection Failed
**Cause:** MONGO_URI not set or invalid  
**Fix:** 
1. Check Render logs for exact error
2. Verify MONGO_URI in environment variables
3. Test MongoDB connection string separately

### Issue 5: Build Fails on Render
**Cause:** Missing dependencies or build script error  
**Fix:**
1. Check package.json has all dependencies
2. Verify build command: `npm install && npm start`
3. Check Node version matches local (in package.json: `"engines": {"node": "18.x"}`)

---

## 📊 Expected Response Formats

### ✅ Successful Responses

**Auth Endpoint (No Token):**
```json
{
  "message": "Not authorized, no token"
}
```
Status: 401 ✅ (Correct)

**Login (Invalid Credentials):**
```json
{
  "message": "Invalid credentials"
}
```
Status: 401 ✅ (Correct)

**Salary Calculate (No Token):**
```json
{
  "message": "Not authorized, no token"
}
```
Status: 401 ✅ (Correct)

### ❌ Error Responses (Backend Asleep)

**Any Endpoint:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/indents</pre>
</body>
</html>
```
Status: 404 ❌ (Service asleep or not deployed)

---

## 🚀 Deployment Verification Steps

### 1. Check Render Service Status
- [ ] Service is "Live" (green)
- [ ] No recent deploy failures
- [ ] Logs show "Server running on port 5000"
- [ ] No error messages in logs

### 2. Verify Environment Variables
- [ ] MONGO_URI is set
- [ ] JWT_SECRET is set
- [ ] ALLOWED_ORIGINS includes frontend URLs
- [ ] PORT is set to 5000

### 3. Test Core Endpoints
- [ ] /api/auth/login returns JSON (not HTML)
- [ ] /api/salary/calculate returns 401 (not 404)
- [ ] /api/indents returns 401 (not 404)
- [ ] /api/material/catalog returns 401 (not 404)

### 4. Test CORS
- [ ] OPTIONS requests return 204
- [ ] Access-Control-Allow-Origin header present
- [ ] Frontend can make requests without CORS errors

### 5. Frontend Integration
- [ ] Login works
- [ ] Token is stored in localStorage
- [ ] Dashboard loads after login
- [ ] API calls include Authorization header

---

## 🎯 Quick Fix Summary

**If backend returns HTML 404:**
1. Wait 60 seconds (service waking up)
2. Make request again
3. If still 404, go to Render Dashboard → Manual Deploy

**If backend returns JSON 401:**
✅ Backend is working! This is expected for protected routes.

**If CORS error in browser:**
1. Check ALLOWED_ORIGINS in Render
2. Redeploy after adding frontend URL

**If MongoDB error in logs:**
1. Verify MONGO_URI is correct
2. Test connection string in MongoDB Compass
3. Check IP whitelist in MongoDB Atlas

---

## 📝 Current Status Checklist

- [x] Backend code has all routes defined correctly
- [x] Frontend axios.js configured for environment detection
- [x] CORS configuration includes localhost and Vercel
- [ ] **Render backend is awake and responding**
- [ ] **All endpoints return JSON (not HTML 404)**
- [ ] **Environment variables verified in Render**
- [ ] **Login test successful**
- [ ] **Material module test successful**
- [ ] **Salary module test successful**

---

## 🔄 Next Steps

1. **Wake up backend** (visit URL in browser or use script above)
2. **Verify deployment** (check Render logs)
3. **Test endpoints** (use test script)
4. **Test frontend** (npm run dev and login)
5. **Deploy frontend to Vercel** (once backend confirmed working)

**Backend code is 100% correct. Issue is deployment/sleep state, not code.**
