# TunePop — Claude notes

## Known fixes

### Safari iOS blank page (Vite + GitHub Pages)
**Symptom**: App renders a completely empty white page in Safari on iOS. Persists across reloads. No visible error.

**Root cause**: Vite injects `crossorigin` on `<script type="module">` and `<link rel="stylesheet">` in the production HTML. Safari iOS sends an `Origin` header with those requests. GitHub Pages' CDN sometimes responds without `Access-Control-Allow-Origin` for same-origin requests (it doesn't always bother since CORS isn't required for same-origin). Safari then silently refuses to execute the script.

**Fix**: Add a Vite plugin in `vite.config.ts` to strip `crossorigin` from the HTML output. All assets are same-origin on GitHub Pages so CORS is unnecessary.

```ts
function removeCrossorigin(): Plugin {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml: (html) => html.replace(/ crossorigin/g, ''),
  }
}
// add to plugins: [react(), removeCrossorigin()]
```

This fix applies to any Vite SPA deployed to GitHub Pages and accessed in Safari on iOS.
