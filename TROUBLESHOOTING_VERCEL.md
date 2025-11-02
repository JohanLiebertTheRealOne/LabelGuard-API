# Troubleshooting Vercel Deployment

## Common Error: "This Serverless Function has Crashed"

### Step 1: Check Vercel Function Logs

1. Go to your Vercel project dashboard
2. Click on the deployment that failed
3. Go to the **Functions** tab
4. Click on the function name (usually `api/index.ts`)
5. Check the **Logs** tab for error messages

### Step 2: Most Common Issues

#### Issue 1: Missing Environment Variables

**Error in logs:**
```
Invalid environment configuration: USDA_API_KEY: Required
```

**Solution:**
1. Go to Project Settings → Environment Variables
2. Add `USDA_API_KEY` with your API key value
3. Make sure it's set for **Production**, **Preview**, and **Development** environments
4. Redeploy the function

#### Issue 2: Module Resolution Error

**Error in logs:**
```
Cannot find module '../src/config/env.js'
```

**Solution:**
The file paths might need adjustment. The updated `api/index.ts` now includes better error handling. Make sure:
- Your `api/index.ts` file exists
- The import paths use `.js` extensions (even for TypeScript files in ESM)
- All dependencies are in `package.json`

#### Issue 3: TypeScript Compilation Error

**Error in logs:**
```
Syntax error in api/index.ts
```

**Solution:**
1. Test locally: `npm run typecheck`
2. Make sure `@vercel/node` is installed: `npm install --save-dev @vercel/node`
3. Check that `tsconfig.json` is configured correctly

#### Issue 4: File Path Issues (OpenAPI Spec)

**Error in logs:**
```
Failed to load OpenAPI spec: ENOENT
```

**Solution:**
This is handled gracefully - the API will still work, just without `/docs`. The updated code tries multiple path strategies.

### Step 3: Debugging Steps

#### Enable Detailed Logging

The updated `api/index.ts` now includes detailed error logging. Check logs for:
- Environment variable status
- Initialization errors
- File path resolution issues

#### Test Locally with Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Run locally with Vercel environment
vercel dev
```

This simulates the exact Vercel environment locally.

#### Check Environment Variables

Run this locally to see what Vercel sees:

```bash
vercel env pull .env.vercel
cat .env.vercel
```

### Step 4: Quick Fixes

#### Quick Fix 1: Rebuild from Scratch

1. Delete the deployment
2. Make sure all environment variables are set
3. Redeploy

#### Quick Fix 2: Check Function Size

Vercel has limits:
- Function size: 50MB (unzipped)
- Execution time: 10 seconds (Hobby), 60 seconds (Pro)

If your function is too large, check `node_modules` size.

#### Quick Fix 3: Verify vercel.json

Make sure your `vercel.json` looks like:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.ts"
    }
  ]
}
```

### Step 5: Get Specific Error Details

To get more details about the crash:

1. **Check Function Logs:**
   - Vercel Dashboard → Your Project → Functions → Logs
   - Look for stack traces and error messages

2. **Check Build Logs:**
   - Vercel Dashboard → Your Deployment → Build Logs
   - Look for compilation errors

3. **Test Endpoint Directly:**
   ```bash
   curl https://your-project.vercel.app/health
   ```
   Check the response for error details

### Common Error Messages & Solutions

| Error Message | Solution |
|--------------|----------|
| `USDA_API_KEY is required` | Set `USDA_API_KEY` in Vercel environment variables |
| `Cannot find module` | Check import paths use `.js` extension |
| `Timeout` | Function execution exceeded time limit |
| `ENOENT: no such file or directory` | File path issue (OpenAPI spec) - API still works |
| `TypeError: Cannot read property` | Check environment variables are set |

### Still Having Issues?

1. **Share the exact error message** from Vercel logs
2. **Check if it works locally:** `npm run dev`
3. **Test with Vercel locally:** `vercel dev`
4. **Verify TypeScript compiles:** `npm run typecheck`

The updated code now includes better error handling and logging to help identify the issue.

