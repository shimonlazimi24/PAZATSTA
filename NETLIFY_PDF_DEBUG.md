# PDF Generation Debugging (Netlify)

## Root cause of "Failed to generate PDF"

The 500 error was likely caused by one or more of:

1. **Font path**: `node_modules/@fontsource/heebo/files/` was used. On Netlify serverless, the function bundle may not include the full `node_modules` tree, or `process.cwd()` may differ. **Fix**: Fonts now live in `public/fonts/` which is deployed with the app.

2. **Date handling**: Prisma may return `lesson.date` as a string in some cases (e.g. after JSON serialization). Calling `.toISOString()` on a string fails. **Fix**: `safeDateStr()` normalizes Date vs string and handles invalid dates.

3. **Silent failures**: Errors were swallowed and returned as generic 404/500. **Fix**: Typed error codes (`LESSON_NOT_FOUND`, `SUMMARY_MISSING`, `RENDER_FAILED`, `DB_FAILED`) and detailed logging.

## How to verify in Netlify logs

1. In Netlify dashboard: **Site → Functions → Logs** (or Deploys → Deploy log).
2. Look for `[pdf]` prefixed lines:
   - `[pdf] filename:` – path being requested
   - `[pdf] lessonId:` – extracted ID
   - `[pdf] lesson exists, lesson.date type:` – confirms DB + date
   - `[pdf] lesson has no summary` – `SUMMARY_MISSING`
   - `[pdf] DB query failed` – `DB_FAILED` (check DATABASE_URL)
   - `[pdf] renderToBuffer failed` – `RENDER_FAILED` (often font loading)

3. Error response now includes `code` and `details`:
   ```json
   { "error": "Failed to generate PDF", "code": "RENDER_FAILED", "details": "..." }
   ```

## Error codes

| Code | Meaning |
|------|---------|
| `LESSON_NOT_FOUND` | No lesson with that ID in DB |
| `SUMMARY_MISSING` | Lesson exists but has no summary |
| `RENDER_FAILED` | `renderToBuffer` threw or invalid PDF output (often font) |
| `DB_FAILED` | Prisma query threw (connection, schema, etc.) |
