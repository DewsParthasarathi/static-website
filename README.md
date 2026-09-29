# Ledgerly - Static Invoice Dashboard

A dependency-free dashboard built with HTML5, CSS3 and vanilla JavaScript. No build step, no backend, no external requests.

## Files
| File | Purpose |
|---|---|
| `index.html` | Semantic markup: sidebar, top bar, summary cards, table, and the form, view and delete modals |
| `css/style.css` | Design tokens, layout, components, responsive rules, dark mode, reduced-motion support |
| `js/script.js` | State, rendering, search/filter/sort, CRUD, validation, modals, dropdowns, toasts, localStorage |

## Run locally
Open `index.html` in a browser, or serve the folder:
```
python3 -m http.server 8080   # then visit http://localhost:8080
```

## How it works
- **State** lives in one object; `render()` redraws cards, table and notifications from it.
- **Persistence**: invoices are stored in `localStorage` (`ledgerly.invoices.v1`). Profile menu > Reset demo data restores the seed set.
- **Search / filter / sort**: `visibleInvoices()` applies search (client or number), status filter and sort. Column headers and the Sort dropdown share the same state.
- **Sidebar**: Overview, Pending, Overdue and Paid set the status filter and page title.
- **Modals**: one form modal for add/edit, one for view, one for delete confirmation. Close with the X, Cancel, backdrop click, or Escape. Focus is trapped and restored.
- **Validation**: name, email, amount and due date are checked on submit with inline messages; a saving flag blocks double submits.
- **Dropdowns** close on outside click and Escape. **Toasts** confirm each success or failure.
- Profile menu also exports the current view as CSV.

## Deploy
All paths are relative, so the site works from a subdirectory.

**GitHub Pages**: push the contents of `static-dashboard/` to a repo, then Settings > Pages > Deploy from a branch > `main` / root. The site appears at `https://<user>.github.io/<repo>/`.

**Netlify**: drag the `static-dashboard` folder onto app.netlify.com/drop, or connect the repo with build command empty and publish directory `.`.

**AWS S3**: create a bucket, disable Block Public Access, enable Static website hosting with `index.html` as the index document, and attach a public-read bucket policy:
```
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::YOUR-BUCKET/*"}]}
```
Upload with `aws s3 sync . s3://YOUR-BUCKET --delete`. S3 website endpoints are HTTP only, so put CloudFront in front for HTTPS (recommended, and lets you keep the bucket private using Origin Access Control).

## Custom domain and HTTPS
- **GitHub Pages**: add the domain under Settings > Pages, create a `CNAME` record to `<user>.github.io` (or A records for an apex domain), then tick Enforce HTTPS.
- **Netlify**: Domain management > Add domain, follow the DNS instructions; a Let's Encrypt certificate is issued automatically.
- **S3**: request a free certificate in AWS Certificate Manager (us-east-1), attach it to a CloudFront distribution with your domain as an alternate name, and point a Route 53 alias or CNAME at the distribution.

## Verify after deployment
1. Open DevTools > Console and Network: no errors, no 404s, all requests use relative paths.
2. Test add, edit, view, delete, search, filters, sorting, CSV export and Reset.
3. Press Escape and Tab to check modals and keyboard navigation; resize to mobile width.
4. Reload to confirm localStorage persistence; hard-refresh to bypass caches.

## Security and deployment notes
- Everything user-entered is rendered with `textContent`, never `innerHTML`, which prevents XSS.
- localStorage is readable by any script on the origin and is not secure storage; do not store real customer data. This is a demo.
- Add a Content-Security-Policy header (Netlify `_headers` or CloudFront response headers), for example `default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'`. Inline styles and scripts are not used.
- Serve over HTTPS only, and add `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`.
- Use cache-control with short TTLs on HTML and long TTLs plus filename versioning on CSS/JS.
