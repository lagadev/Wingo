# WinGo Virtual (Cloudflare Worker + D1) — virtual coins only
1. `npm i -g wrangler && wrangler d1 create wingo` → copy database_id into wrangler.toml
2. `wrangler d1 execute wingo --remote --file=schema.sql`
3. `wrangler secret put SECRET` (any long random string)
4. `wrangler deploy`
New users get 1000 virtual coins. Results are generated server-side (random 0-9), payouts follow the original rules (2% fee, 9x / 4.5x / 2x / 1.5x).
