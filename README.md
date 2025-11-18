# Santa's Helper • AI Gift Recommendation Agent

A Next.js + Tailwind + shadcn-style UI project that implements a kid-friendly
wizard to generate gift ideas using Google Gemini and send a formatted wish list
email to parents via Resend.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env.local
   ```

   Fill in:

   - `GEMINI_API_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`

3. Run the dev server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000` in your browser.

## Notes

- If `GEMINI_API_KEY` is missing, the app will use a small static fallback list
  so you can still test the flow and UI.
- If `RESEND_API_KEY` is missing, the `/api/send-email` endpoint will validate
  the payload but will not actually send an email (it returns a mocked response).
