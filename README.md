# TrustGuard AI — RAG Underwriting Version

This version turns the site into a retrieval-augmented underwriting assistant.

## What changed

- Added retrieval-first underwriting logic in `netlify/functions/claude.js`
- The function now retrieves matching underwriting rules before calling Claude
- The model is forced to classify each scenario as one of:
  - `DECLINE`
  - `POTENTIAL_DECLINE`
  - `REFER`
  - `ACCEPT`
- The UI shows the model decision and the retrieved guideline snippets used
- Anthropic is still called securely from a Netlify Function

## How the RAG flow works

1. User enters an underwriting scenario.
2. The Netlify function scores local underwriting rules against the scenario.
3. The top matching rules are injected into the Claude prompt.
4. Claude returns JSON with:
   - decision
   - summary
   - reasoning
   - conditions / missing info
   - cited rule IDs
   - confidence
5. The frontend renders the response and the retrieved rule tags.

## Edit the underwriting knowledge base

Open:

`netlify/functions/claude.js`

Look for the `UNDERWRITING_RULES` array.

Each rule has:
- `id`
- `title`
- `decision`
- `category`
- `keywords`
- `text`

That is the easiest place to replace the sample rules with your real underwriting guidelines.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run locally:
   ```bash
   npx netlify dev
   ```

## Deploy to Netlify

1. Push this folder to GitHub.
2. Import the repo into Netlify.
3. Use:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables:
   - `ANTHROPIC_API_KEY`
   - `ANTHROPIC_MODEL=claude-sonnet-4-6` (optional)
5. Deploy.

## Current limitation

This package uses local rule retrieval, not embeddings or a vector database.
That makes it easy to deploy on Netlify right now.

If you want the next version, the best upgrade is:
- store underwriting guidelines in JSON/Markdown files or a database
- create embeddings for the rules
- retrieve semantically similar chunks
- keep the same decision schema
