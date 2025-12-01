# 🔐 Security Fix: Gemini API Key Exposure

## ⚠️ CRITICAL: API Key Was Exposed in Client-Side Code

**Issue:** The Gemini API key was hardcoded in client-side files (`WebAccessLock.tsx` and `content.ts`), making it visible to anyone who inspects the extension or web app.

**Risk:** Attackers can steal the key and make unlimited API calls, exhausting your quota or incurring charges.

---

## ✅ Solution Implemented

### 1. **Moved API Key to Backend** (`.env` file)
```env
GEMINI_API_KEY=AIzaSyCX4h0np3GhtHuokPU9F6WRgSCtwoBW570
```

### 2. **Created Secure Backend Proxy**
- **New route:** `server/src/routes/gemini.ts`
- **Endpoint:** `POST /api/gemini/analyze`
- **Authentication:** Requires valid JWT token
- Server makes the Gemini API call with the key safely stored server-side

### 3. **Updated Client Code**
- **Removed** hardcoded API keys from:
  - `src/pages/WebAccessLock.tsx`
  - `src/extension/content.ts`
- **Now calls** backend proxy instead of directly calling Gemini API

---

## 🚨 Immediate Actions Required

### 1. **Revoke the Exposed Key**
Since the old key was committed to Git and potentially exposed:

1. Go to: https://makersuite.google.com/app/apikey
2. **Delete** the key: `AIzaSyCX4h0np3GhtHuokPU9F6WRgSCtwoBW570`
3. **Generate a new key**
4. Update `server/.env` with the new key

### 2. **Update Git History** (Optional but Recommended)
The key is in your Git history. To remove it:

```bash
# CAUTION: This rewrites history. Coordinate with team if others have cloned the repo.
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch src/pages/WebAccessLock.tsx src/extension/content.ts" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

Or use a tool like **BFG Repo-Cleaner**: https://rtyley.github.io/bfg-repo-cleaner/

### 3. **Rebuild and Restart**

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Extension
npm run build:extension

# Reload extension in Chrome
```

---

## 📋 Files Changed

### Backend (NEW)
- ✅ `server/src/routes/gemini.ts` - Secure proxy endpoint
- ✅ `server/src/app.ts` - Registered route
- ✅ `server/.env` - Added `GEMINI_API_KEY`
- ✅ `server/.env.example` - Added example

### Frontend (UPDATED)
- ✅ `src/pages/WebAccessLock.tsx` - Uses `/api/gemini/analyze`
- ✅ `src/extension/content.ts` - Uses `/api/gemini/analyze`

---

## 🔒 Security Best Practices Going Forward

1. **Never commit secrets to Git**
   - Use `.env` files (already in `.gitignore`)
   - Use environment variables for all sensitive data

2. **Always use backend proxies for API keys**
   - Client → Backend → Third-party API
   - Backend validates auth token before proxying

3. **Rotate keys regularly**
   - Generate new API keys periodically
   - Especially after any potential exposure

4. **Use API restrictions** (Gemini Console)
   - Restrict by IP address (your server IP)
   - Restrict by HTTP referrer (your domain)
   - Set daily quotas

5. **Monitor API usage**
   - Check Google Cloud Console for unusual activity
   - Set up billing alerts

---

## 🧪 Testing the Fix

```bash
# 1. Start backend
cd server
npm run dev

# 2. Test AI analysis in extension
# Navigate to any website and click the shield button

# 3. Test AI suggestions in Web Access Lock page
# Open the app and click "AI Suggestions"
```

Both should now work securely through the backend proxy!

---

## ❓ FAQ

**Q: Can users still inspect network requests and see the API calls?**  
A: Yes, but they'll only see calls to YOUR backend (`/api/gemini/analyze`). The actual Gemini API key stays hidden on the server.

**Q: What if someone steals a user's JWT token?**  
A: They could make AI requests, but only while that token is valid. You can add rate limiting to prevent abuse.

**Q: Should I add rate limiting?**  
A: Yes! Consider using `express-rate-limit`:
\`\`\`typescript
import rateLimit from 'express-rate-limit';

const geminiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // limit each user to 10 requests per windowMs
});

router.post('/analyze', geminiLimiter, requireAuth, async (req, res) => { ... });
\`\`\`

---

**Status:** ✅ Fixed - API key is now secure on the backend!
