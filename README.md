# TrustGuard AI — Netlify Ready

This package converts your uploaded React prototype into a Netlify-deployable Vite app with a secure Netlify Function for Claude API calls.

## What was changed

- Wrapped the UI in a Vite React app
- Moved the Claude API call into `netlify/functions/claude.js`
- Switched the frontend to call `/.netlify/functions/claude`
- Added `netlify.toml` so Netlify knows the build command, publish folder, and functions folder
- Added `.env.example` for required environment variables

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the frontend locally:
   ```bash
   npm run dev
   ```
3. To test the Netlify function locally, use Netlify CLI instead:
   ```bash
   npx netlify dev
   ```

## Deploy to Netlify

1. Push this folder to GitHub.
2. In Netlify, choose **Add new site** → **Import an existing project**.
3. Connect your GitHub repo.
4. Netlify should detect:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. In Netlify site settings, add environment variables:
   - `ANTHROPIC_API_KEY`
   - `ANTHROPIC_MODEL` = `claude-sonnet-4-6` (optional, but recommended)
6. Trigger a deploy.

## Important note

Your original code called Anthropic directly from the browser. That would expose the API key publicly. The Netlify Function keeps the key on the server side instead.


## Important Netlify build note
If Netlify fails during `npm install` and the log mentions an internal or unexpected registry URL, delete `package-lock.json` and redeploy. This package already omits the lockfile and includes `.npmrc` pointing to the public npm registry.
