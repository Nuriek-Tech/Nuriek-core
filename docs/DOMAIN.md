# Nuriek Core — custom domain

## Working URL (use this)

**https://core.nuriek.com**

This hostname is on Vercel and resolves in DNS.

## Does not work (unless you add DNS)

**https://www.core.nuriek.com** → `DNS_PROBE_FINISHED_NXDOMAIN`

There is no DNS record for `www.core.nuriek.com` today. Offer links in old emails may use `www` — use the apex URL above or add DNS (below).

## Vercel environment variables

Set for **Production**:

| Variable | Value |
|----------|--------|
| `NEXTAUTH_URL` | `https://core.nuriek.com` |
| `PORTAL_PUBLIC_URL` | `https://core.nuriek.com` |

Redeploy after changing.

## Optional: enable `www` (redirects to apex)

1. **Vercel** → Project → Settings → Domains → Add `www.core.nuriek.com`
2. **DNS** (where `nuriek.com` is managed) add:
   - Type: `CNAME`
   - Name: `www.core`
   - Value: `cname.vercel-dns.com` (or the target Vercel shows)
3. The app redirects `www` → `core.nuriek.com` automatically.

## Offer links in emails

New emails use `PORTAL_PUBLIC_URL` or default `https://core.nuriek.com/offer/...`.

If a candidate has an old link with `www`, send a new email or replace `www.` with nothing in the URL.
