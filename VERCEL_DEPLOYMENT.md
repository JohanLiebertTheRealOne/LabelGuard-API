# Vercel Deployment Guide

This guide will help you deploy LabelGuard API to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your code pushed to GitHub (recommended) or another Git provider
3. A valid USDA API key

## Quick Deploy (Recommended)

### Option 1: Deploy via Vercel Dashboard

1. **Import Project**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect the project

2. **Configure Project**
   - Framework Preset: "Other" (or leave as auto-detected)
   - Root Directory: `.` (default)
   - Build Command: Leave empty (not needed for serverless)
   - Output Directory: Leave empty
   - Install Command: `npm install`

3. **Set Environment Variables**
   - Click "Environment Variables" in project settings
   - Add the following:
     ```
     USDA_API_KEY=your_usda_api_key_here (required)
     NODE_ENV=production (auto-set by Vercel)
     CORS_ORIGIN=your_frontend_url (optional)
     RATE_LIMIT_WINDOW_MS=900000 (optional)
     RATE_LIMIT_MAX=100 (optional)
     TRUST_PROXY=true (optional, recommended for Vercel)
     ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your API will be live at `https://your-project.vercel.app`

### Option 2: Deploy via CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Select your project settings
   - When asked about environment variables, you can add them now or later in the dashboard

4. **Set Environment Variables (if not set during deploy)**
   ```bash
   vercel env add USDA_API_KEY
   # Paste your API key when prompted
   
   # Optional variables
   vercel env add CORS_ORIGIN
   vercel env add TRUST_PROXY
   ```

5. **Production Deploy**
   ```bash
   vercel --prod
   ```

## Project Structure

The deployment uses:
- `api/index.ts` - Serverless function entry point
- `vercel.json` - Vercel configuration
- `src/` - Application source code

## Environment Variables

Required:
- `USDA_API_KEY` - Your USDA FoodData Central API key

Optional:
- `CORS_ORIGIN` - Comma-separated allowed origins (e.g., `https://app.example.com`)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds (default: 900000)
- `RATE_LIMIT_MAX` - Max requests per window (default: 100)
- `TRUST_PROXY` - Set to `true` for Vercel (recommended)
- `NODE_ENV` - Automatically set to `production` by Vercel

## Testing Locally with Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Run local serverless environment
vercel dev
```

This will:
- Start a local server simulating Vercel's serverless environment
- Use environment variables from `.env` file
- Test at `http://localhost:3000`

## Troubleshooting

### Issue: Cold Start Latency

**Problem**: First request after deployment takes longer (~500ms-2s)

**Solution**: This is normal for serverless functions. Subsequent requests will be faster. Consider:
- Using Vercel Pro plan for better performance
- Implementing health check pings to keep function warm

### Issue: Environment Variables Not Working

**Problem**: API returns errors about missing configuration

**Solution**:
1. Verify variables are set in Vercel dashboard (Project Settings → Environment Variables)
2. Ensure variables are set for correct environments (Production, Preview, Development)
3. Redeploy after adding variables
4. Check variable names match exactly (case-sensitive)

### Issue: CORS Errors

**Problem**: Browser shows CORS errors when accessing API

**Solution**:
1. Set `CORS_ORIGIN` in Vercel environment variables
2. Include your frontend URL (e.g., `https://your-app.vercel.app`)
3. Include `http://localhost:3000` for local development if needed
4. Redeploy after setting

### Issue: OpenAPI Docs Not Loading

**Problem**: `/docs` endpoint shows error

**Solution**: This is expected in serverless - file paths may differ. The API endpoints still work. You can:
- Access docs locally with `npm run dev`
- Or serve OpenAPI spec from a CDN

### Issue: Build Fails

**Problem**: Deployment fails during build

**Solution**:
1. Check build logs in Vercel dashboard
2. Ensure `@vercel/node` is installed: `npm install --save-dev @vercel/node`
3. Verify TypeScript compiles: `npm run typecheck`
4. Check that `api/index.ts` exists and exports default handler

## Custom Domain

To add a custom domain:

1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions
4. Wait for DNS propagation (can take up to 48 hours)

## Monitoring

- View function logs in Vercel dashboard → Functions
- Monitor performance in Analytics tab
- Set up error alerts in Project Settings

## Cost Considerations

**Hobby Plan (Free)**:
- 100GB bandwidth/month
- Unlimited serverless function executions
- Good for development and small projects

**Pro Plan ($20/month)**:
- Better performance
- More bandwidth
- Priority support

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Serverless Functions Guide](https://vercel.com/docs/functions)
- [Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)

