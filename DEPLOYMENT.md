# 🚀 Deployment Guide

This guide will help you deploy your chat app to Cloudflare Workers with automated GitHub Actions.

## Quick Start (5 minutes)

### Step 1: Get Your Cloudflare API Token

1. **Go to Cloudflare Dashboard:**
   - Visit: https://dash.cloudflare.com/profile/api-tokens
   - Log in with your Cloudflare account

2. **Create a new token:**
   - Click **"Create Token"**
   - Use the **"Edit Cloudflare Workers"** template
   - Click **"Use template"**

3. **Configure permissions (should be pre-filled):**
   - Account Resources: `Cloudflare Workers Scripts` - Edit
   - Zone Resources: `Workers Routes` - Edit
   - Click **"Continue to summary"**

4. **Create and copy the token:**
   - Click **"Create Token"**
   - **Copy the token** (you won't see it again!)
   - Keep it somewhere safe temporarily

### Step 2: Add Token to GitHub

1. **Go to your repository settings:**
   - Navigate to: `https://github.com/drewc611/durable-chat-app/settings/secrets/actions`
   - Or: Repository → Settings → Secrets and variables → Actions

2. **Create new secret:**
   - Click **"New repository secret"**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: Paste the token you copied
   - Click **"Add secret"**

### Step 3: Trigger Deployment

**Option A: Push to trigger automatic deployment**
```bash
git push origin claude/implement-improvements-6eLhN
```

**Option B: Manual trigger from GitHub**
1. Go to: `https://github.com/drewc611/durable-chat-app/actions`
2. Click on **"Deploy to Cloudflare Workers"** workflow
3. Click **"Run workflow"**
4. Select your branch and click **"Run workflow"**

### Step 4: Watch Deployment

1. Go to: `https://github.com/drewc611/durable-chat-app/actions`
2. Click on the running workflow
3. Watch the deployment progress
4. Once complete, you'll see: ✅ Successfully deployed to Cloudflare Workers!

---

## What Happens Automatically

Every time you push to your branch, GitHub Actions will:

1. ✅ **Run linter** - Check code quality
2. ✅ **Run all tests** - Ensure 26 tests pass
3. ✅ **Type check** - Verify TypeScript compilation
4. ✅ **Deploy to Cloudflare** - Only if all checks pass

---

## Alternative: Local Deployment

If you prefer to deploy from your local machine:

```bash
# Authenticate (one-time)
npx wrangler login

# Deploy
npm run deploy
```

---

## Viewing Your Deployment

After deployment, Wrangler will output your app's URL:

```
Published your-app-name (0.xx sec)
  https://your-app-name.your-account.workers.dev
```

Open that URL to see your live chat app!

---

## Monitoring Your Deployment

View logs in real-time:

```bash
npx wrangler tail
```

View deployment history:
```bash
npx wrangler deployments list
```

---

## Troubleshooting

### "Unauthorized" Error
- Check that `CLOUDFLARE_API_TOKEN` secret is set correctly
- Verify the token has the right permissions
- Token might have expired - create a new one

### "Account ID not found"
- Make sure you have a Cloudflare account
- Verify you're logged into the correct account

### Tests Failing
- Run `npm test` locally to see what's failing
- Fix the issues before pushing

### Build Fails
- Run `npm run check` locally
- Ensure all TypeScript errors are resolved

---

## Security Notes

- ✅ Never commit API tokens to your repository
- ✅ Store tokens only in GitHub Secrets
- ✅ Rotate tokens periodically for security
- ✅ Use minimal permissions (only what's needed)

---

## Next Steps

After deployment:
- Share your chat URL with others
- Monitor usage in Cloudflare Dashboard
- Set up custom domain (optional)
- Enable analytics (optional)

---

Need help? Check the [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) or [GitHub Actions docs](https://docs.github.com/en/actions).
