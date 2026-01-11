# Deploying to Render

This guide walks you through deploying your NestJS backend to Render.

## Prerequisites

- GitHub account with your repository pushed
- Firebase project with service account credentials
- Render account

## Deployment Steps

### 1. Prepare Your Environment Variables

Before deploying, you'll need these environment variables from Firebase Console:

- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Service account email
- `FIREBASE_PRIVATE_KEY` - Service account private key (include the full key with `\n` for newlines)

### 2. Create a Web Service on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:

   **Basic Settings:**
   - **Name:** `mindora-backend` (or your preferred name)
   - **Region:** Choose closest to your users
   - **Branch:** `main` (or your default branch)
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Instance Type:** Free (or paid for production)

### 3. Configure Environment Variables

In the Render dashboard, add these environment variables:

```
NODE_ENV=production
PORT=3000
NODE_OPTIONS=--max-old-space-size=512

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----\n"

# JWT Configuration
JWT_SECRET=your-generated-secret-key
JWT_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=https://your-frontend-url.com
```

**Important Notes:**
- For `FIREBASE_PRIVATE_KEY`, make sure to keep the newline characters (`\n`)
- Use Render's "Generate Value" for `JWT_SECRET` for better security
- Replace `FRONTEND_URL` with your actual frontend URL

### 4. Deploy

1. Click **"Create Web Service"**
2. Render will automatically deploy your application
3. Wait for the build to complete (3-5 minutes)

### 5. Verify Deployment

Once deployed, you can test your API:

```bash
curl https://your-service-name.onrender.com
```

## Troubleshooting

### Memory Issues

If you encounter "JavaScript heap out of memory" errors:

1. The `NODE_OPTIONS=--max-old-space-size=512` environment variable is already set
2. For free tier, 512MB is the maximum
3. Consider upgrading to a paid plan if your app needs more memory

### Build Failures

- Check the build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify your Node version compatibility

### Environment Variables Not Working

- Double-check that all environment variables are correctly set
- For Firebase private key, ensure newlines are preserved as `\n`
- Restart the service after updating environment variables

### Port Binding Issues

- Render automatically assigns a PORT environment variable
- Make sure your `main.ts` uses `process.env.PORT`

## Post-Deployment

### Enable Auto-Deploy

Render can automatically deploy when you push to your GitHub repository:

1. Go to your service settings
2. Under **"Build & Deploy"**
3. Enable **"Auto-Deploy"** for your branch

### Monitor Your Service

- Check logs in the Render dashboard
- Set up health check endpoints
- Monitor response times and errors

### Update Frontend CORS

Update your frontend to point to the new backend URL:
```
https://your-service-name.onrender.com
```

## Free Tier Limitations

⚠️ **Important:** Free tier services on Render:
- Spin down after 15 minutes of inactivity
- Take 50+ seconds to spin up on first request
- Limited to 512MB RAM

For production apps, consider upgrading to a paid plan.

## Useful Commands

```bash
# View logs
# Go to Render dashboard → Your Service → Logs

# Manual deploy
# Go to Render dashboard → Your Service → Manual Deploy → Deploy latest commit

# Shell access
# Go to Render dashboard → Your Service → Shell
```

## Next Steps

- Set up a custom domain
- Configure health checks
- Set up monitoring and alerts
- Consider upgrading for better performance
