# Deploying IYonicorp Frontend on Render

## Prerequisites
1. GitHub/GitLab/Bitbucket account with the code pushed
2. Render account (https://render.com)
3. Node.js and npm installed locally (for testing)

## Step-by-Step Deployment Guide

### 1. Prepare Your Repository
Ensure your code is pushed to a Git repository:
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main  # or your default branch
```

### 2. Create Render Static Site
1. Log in to Render dashboard
2. Click "New +" → "Static Site"
3. Connect your Git repository
4. Configure the build settings:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Environment**: Node.js (will be auto-detected)
   - **Root Directory**: Leave blank (root of repo)

### 3. Environment Variables (if needed)
If your frontend requires environment variables (like API URLs):
1. In Render dashboard, go to your static site → Environment
2. Add variables under "Environment Variables":
   - Example: `VITE_API_URL=https://your-backend.onrender.com`
   - Note: Vite variables must start with `VITE_` to be exposed to frontend

### 4. Important Notes for This Project
- The frontend communicates with a backend API
- You'll need to deploy the backend separately (as a Render Web Service)
- Update API calls in frontend to point to your deployed backend URL
- Common files that might need adjustment:
  - API service files (check src/services/ or similar)
  - Environment configuration

### 5. Backend Deployment (Separate Service)
For the complete stack, you'll also need to deploy the backend:
1. Create a new "Web Service" on Render
2. Use the same repository
3. Configure:
   - **Build Command**: `npm install` (or leave blank if using Dockerfile)
   - **Start Command**: `npm run server` or `node server/server.js`
   - **Environment**: Node.js
   - Add necessary environment variables (PORT, JWT_SECRET, DATABASE_URL, etc.)

### 6. Database Setup
This application uses PostgreSQL:
1. Create a PostgreSQL database on Render
2. Note the internal database URL
3. Add `DATABASE_URL` environment variable to your backend service
4. Run migrations (you may need to trigger this manually or via startup script)

### 7. Troubleshooting Tips
- **Build fails**: Check logs for missing dependencies or TypeScript errors
- **404 on refresh**: Ensure your frontend handles client-side routing correctly (React Router)
- **API connection issues**: Verify CORS settings and API URLs
- **Environment variables**: Remember they're case-sensitive and must match exactly

### 8. Local Testing Before Deploy
Test your build locally:
```bash
npm run build
# Then serve the dist folder to verify
npm install -g serve
serve -s dist
```

## Your render.yaml File
I've created a basic render.yaml file in your project root. For Render, you typically configure through the dashboard rather than using this file directly (it's more for reference). However, you can use it with Render's CLI if preferred.

## Next Steps
1. Push your code to Git
2. Create the static site on Render
3. Deploy your backend
4. Configure environment variables
5. Test the integration