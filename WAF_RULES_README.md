# WAF starter rules for Signal Lynx Key Commander style sites

This doc captures a practical WAF setup that blocks the constant background noise (CMS probes, config grabs, traversal, random admin panels) without relying on Basic Bot Fight Mode.

Important note on Bot Fight and Key Commander:  
Basic Bot Fight Mode (Cloudflare and Vercel) can break legitimate server to server traffic between a frontend and a backend (for example, this website calling a Key Commander server). These rules are a lightweight alternative that plays nicer with backend calls.

Scope

**Note on Domain Split:**
This template automatically redirects admin traffic to `admin.yourdomain.com`.
You should apply the strict **Rate Limiting** and **Block High Threat** rules specifically to the `admin` subdomain in Cloudflare, while keeping the general bot noise rules on your main domain. This domain split will also allow you to apply additional security challenges on your admin domain, while keeping your primary website domains under Vercel (or other), and not getting into a Cloudflare vs Vercel Edge Argument (Vercel wants to be edge, and will complain if your primary website domains are proxied under cloudflare)

If you follow this domain split, then Cloudflare WAF rules only protect hostnames that are proxied (orange cloud). In the recommended split, that’s typically admin.yourdomain.com only.

Domain: yourdomain.com and sub domains www.yourdomain.com and admin.yourdomain.com
Rules type: Security rules (Custom rules) plus Rate limiting rules  
Order matters. Follow the rule order below.

Remember - Security is an ongoing battle; Monitor the safety of your site and update your security rules and settings accordingly.

---

## Cloudflare WAF Rules (Template)

## Rule order we use

These numbers match the order shown in Cloudflare’s dashboard sections. Cloudflare evaluates Custom rules in order within the Custom rules list, and Rate limiting rules in order within the Rate limiting list.

1. Block Bots - Rule 1 (custom rule, Block)
2. Block Bots - Rule 2 (custom rule, Block, evaluated after Rule 1)
3. Block high threat bots (custom rule, Managed Challenge, evaluated after Rule 2)
4. Block AI Scrapers - Optional (custom rule, Block, optional, evaluated after Rule 3)
5. Rate Limit - API End Points (rate limiting rule) - Note this version of the Rule is Key Commander Specific

Why Rule 1 and Rule 2 are split  
Cloudflare rule expressions have character limits. Rule 1 is at the limit, so the pattern set is split into Rule 1 and Rule 2.

---

## Custom rule 1

Name  
Block Bots - Rule 1

Action  
Block

Placement  
First

Expression

(http.host in {"yourdomain.com" "www.yourdomain.com" "admin.yourdomain.com"}) and not cf.client.bot and (
http.request.uri.path contains "/Assets/"
or lower(http.request.uri.path) contains ".php"
or lower(http.request.uri.path) contains ".asp"
or lower(http.request.uri.path) contains ".aspx"
or lower(http.request.uri.path) contains ".jsp"
or lower(http.request.uri.path) contains ".cgi"
or lower(http.request.uri.path) contains ".env"
or lower(http.request.uri.path) contains "/env."
or lower(http.request.uri.path) contains ".git"
or lower(http.request.uri.path) contains ".ini"
or lower(http.request.uri.path) contains ".config"
or lower(http.request.uri.path) contains ".bak"
or lower(http.request.uri.path) contains ".sql"
or lower(http.request.uri.path) contains ".sqlite"
or lower(http.request.uri.path) contains "/wp-"
or lower(http.request.uri.path) contains "/wp/"
or lower(http.request.uri.path) contains "/wp-admin"
or lower(http.request.uri.path) contains "/wp-content"
or lower(http.request.uri.path) contains "/wp-includes"
or lower(http.request.uri.path) contains "/wp-login"
or lower(http.request.uri.path) contains "/wp-json"
or lower(http.request.uri.path) contains "/wordpress"
or lower(http.request.uri.path) contains "/xmlrpc"
or lower(http.request.uri.path) contains "/xmlrpc.php"
or lower(http.request.uri.path) contains "/cgi-bin"
or lower(http.request.uri.path) contains "/phpmyadmin"
or lower(http.request.uri.path) contains "/pma/"
or lower(http.request.uri.path) contains "/myadmin"
or lower(http.request.uri.path) contains "/alfa_data"
or lower(http.request.uri.path) contains "/fckeditor"
or lower(http.request.uri.path) contains "/vendor/phpunit"
or lower(http.request.uri.path) contains "/phpunit"
or lower(http.request.uri.path) contains "/sites/default/files"
or lower(http.request.uri.path) contains "/images/stories"
or lower(http.request.uri.path) contains "/components/"
or lower(http.request.uri.path) contains "/modules/"
or lower(http.request.uri.path) contains "/system/"
or lower(http.request.uri.path) contains "/template/"
or lower(http.request.uri.path) contains "/admin/uploads"
or lower(http.request.uri.path) contains "/admin/images"
or lower(http.request.uri.path) contains "/admin/editor"
or lower(http.request.uri.path) contains "/admin/controller/extension/extension"
or lower(http.request.uri.path) contains "/vendor/"
or lower(http.request.uri.path) contains "/backup"
or lower(http.request.uri.path) contains "/old/"
or lower(http.request.uri.path) contains "/install/"
or lower(http.request.uri.path) contains "/temp/"
or lower(http.request.uri.path) contains "/upload/"
or lower(http.request.uri.path) contains "/uploads/"
or lower(http.request.uri.path) contains "/php/"
or lower(http.request.uri.path) contains ".well-knownold"
or lower(http.request.uri.path) contains "mod_simplefileupload"
or lower(http.request.uri.path) contains "/site/"
or lower(http.request.uri.path) contains "/public/"
or lower(http.request.uri.path) contains "/plugins/"
or lower(http.request.uri.path) contains "/include/"
or lower(http.request.uri.path) contains "/local/"
or lower(http.request.uri.path) contains "/mini"
or lower(http.request.uri.path) contains "/files/"
or lower(http.request.uri.path) contains "/blog/"
or lower(http.request.uri.path) contains "/new/"
or lower(http.request.uri.path) contains "/shop/"
or lower(http.request.uri.path) contains "/phpinfo"
or lower(http.request.uri.path) contains "/manifest.json"
or lower(http.request.uri.path) contains "magento"
or lower(http.request.uri.path) contains "/info"
or lower(http.request.uri.path) contains "/api/action"
)

Notes  
The `/Assets/` check is case sensitive in this expression. Keep it if you intentionally serve assets there. If your site uses a different path, change it to match or remove it.

---

## Custom rule 2

Name  
Block Bots - Rule 2

Action  
Block

Placement  
Custom, fire after Block Bots - Rule 1

Expression

(http.host in {"yourdomain.com" "www.yourdomain.com" "admin.yourdomain.com"}) and not cf.client.bot and (
lower(http.request.uri.path) contains ".log"
or lower(http.request.uri.path) contains "../"
or lower(http.request.uri.path) contains "%2e%2e%2f"
or lower(http.request.uri.path) contains "%2f..%2f"
or lower(http.request.uri.path) contains "/.svn"
or lower(http.request.uri.path) contains "/.hg"
or lower(http.request.uri.path) contains "/.bzr"
or lower(http.request.uri.path) contains ".ds_store"
or lower(http.request.uri.path) contains "thumbs.db"
or lower(http.request.uri.path) contains "id_rsa"
or lower(http.request.uri.path) contains "id_dsa"
or lower(http.request.uri.path) contains "/.ssh/"
or lower(http.request.uri.path) contains "/.aws"
or lower(http.request.uri.path) contains "/server-status"
or lower(http.request.uri.path) contains "/manager/html"
or lower(http.request.uri.path) contains "/jenkins"
or lower(http.request.uri.path) contains "/hudson"
or lower(http.request.uri.path) contains "/solr/admin"
or lower(http.request.uri.path) contains "/actuator"
or lower(http.request.uri.path) contains "/update/"
or lower(http.request.uri.path) contains "/upload"
or lower(http.request.uri.path) contains "/css/"
or lower(http.request.uri.path) contains "/assets/images/"
or (
starts_with(lower(http.request.uri.path), "/.well-known/")
and not (
lower(http.request.uri.path) eq "/.well-known/security.txt"
or lower(http.request.uri.path) eq "/.well-known/assetlinks.json"
or lower(http.request.uri.path) eq "/.well-known/apple-app-site-association"
)
)
or lower(http.request.uri.path) contains "/\_ignition"
or lower(http.request.uri.path) contains "/feed/"
or lower(http.request.uri.query) contains "feed="
or lower(http.request.uri.path) contains "execute-solution"
or lower(http.request.uri.path) contains "enhancecp"
or lower(http.request.uri.path) contains "/test"
or lower(http.request.uri.path) contains "/info/"
or lower(http.request.uri.path) contains "/debug/"
or lower(http.request.uri.path) eq "/fwc"
or starts_with(lower(http.request.uri.path), "/fwc/")
or ends_with(lower(http.request.uri.path), ".fwz")
or lower(http.request.uri.path) eq "/apps"
or starts_with(lower(http.request.uri.path), "/apps/")
or lower(http.request.uri.path) eq "/api/action"
or starts_with(lower(http.request.uri.path), "/api/action/")
or lower(http.request.uri.path) contains "sftp-config.json"
or lower(http.request.uri.path) contains "/.vscode/"
or lower(http.request.uri.path) contains "/my-account"
)

Notes  
The `/css/` and `/assets/images/` matches are intentionally aggressive. If your site legitimately serves those paths, remove or narrow those lines. Many modern builds serve under `/assets/` or `_app`, not `/css/`.

---

## Custom rule 3

Name  
Block high threat bots

Action  
Managed Challenge

Placement  
Custom, fire after Block Bots - Rule 2

Expression

(http.host in {"yourdomain.com" "www.yourdomain.com" "admin.yourdomain.com"}) and not cf.client.bot and starts_with(lower(http.request.uri.path), "/admin")

Notes  
This protects admin paths without hard blocking. If you use a different admin prefix, change `/admin` to match your route.

---

## Custom rule 4 (Optional)

Name  
Block AI Scrapers

Action  
Block

Placement  
Custom, fire after Block high threat bots (rule 3)

Expression

(http.host in {"yourdomain.com" "www.yourdomain.com" "admin.yourdomain.com"}) and (
http.user_agent contains "GPTBot"
or http.user_agent contains "ChatGPT-User"
or http.user_agent contains "CCBot"
or http.user_agent contains "Bytespider"
or http.user_agent contains "ClaudeBot"
or http.user_agent contains "Anthropic"
or http.user_agent contains "SERankingBacklinksBot"
)

When to enable  
This is best while website access gates are up, during early beta, or when you want to reduce automated scraping.

When to disable  
Turn it off when you want AI indexing and broader crawler visibility to help discovery. You can also replace this with Cloudflare AI Crawl Control settings if you prefer.

---

## Rate limiting rule (Key Commander Specific)

Name  
Rate Limit - API End Points

Match (Expression Preview)

(http.request.uri.path contains "/api/v1/validate") or (http.request.uri.path contains "/report-error") or (http.request.uri.path contains "/contact_us")

Characteristics  
IP

Threshold  
10 requests per 10 seconds

Action  
Block for 10 seconds

Placement  
First

Notes  
If you run these endpoints behind a reverse proxy, keep Cloudflare proxying enabled so the client IP is preserved correctly. If you ever see legitimate bursts getting blocked, bump the period to 20 seconds or raise the request count slightly.

---

## Troubleshooting

If something breaks, check Security Events first  
Cloudflare Dashboard → Security → Events  
Look at the rule name that fired, then adjust the specific line causing the false positive.

Common false positives  
• Static assets under `/css/` or `/assets/images/` (Rule 2)  
• Non admin routes that start with `/admin` (Rule 3)  
• Legitimate `.well-known` endpoints you need for mobile apps or security files (Rule 2)

---

## Suggested next doc

If you want to share your exact WAF rules publicly, keep this doc generic and move your site specific allowlists into a separate file like:

docs/security/CLOUDFLARE_WAF_SITE_RULES.md

That keeps the template useful for the community while still letting you ship a hardened baseline.

---

## Vercel WAF Rules (Template)

---

## Edge ownership warning (Cloudflare vs Vercel)

Cloudflare and Vercel can both act as “the edge” (proxy/WAF/challenges). If you let **both** try to be the edge for the **same hostname**, you can get:

- Vercel “domain misconfigured” errors (common when Cloudflare proxy is enabled in front of Vercel)
- Double challenges / broken sessions
- Bot protection blocking legit server-to-server API calls

### Rule of thumb

For each hostname, pick **one** edge provider that owns the request lifecycle.

### Recommended split (works well with Vercel + Cloudflare Access)

| Hostname               | Cloudflare DNS mode    | Edge owner | Security owner                                   |
| ---------------------- | ---------------------- | ---------- | ------------------------------------------------ |
| `yourdomain.com`       | DNS only (grey cloud)  | Vercel     | Vercel Firewall                                  |
| `www.yourdomain.com`   | DNS only (grey cloud)  | Vercel     | Vercel Firewall                                  |
| `admin.yourdomain.com` | Proxied (orange cloud) | Cloudflare | Cloudflare Access (MFA) + optional Vercel bypass |

### Why `admin.yourdomain.com` is special

Admin is high-value. Putting it behind **Cloudflare Access** gives you MFA (email PIN, etc.) without forcing Cloudflare proxy on the entire site (which can trigger Vercel domain validation issues).

### Important: ACME / Certificates on `admin.*` behind Access

If `admin.yourdomain.com` is proxied + protected by Cloudflare Access, ensure **ACME validation is not blocked**.
Add an Access bypass for:

- `/.well-known/acme-challenge/*`

(Otherwise certificate issuance/renewal can fail.)

### What the Vercel rules do in this model

- Vercel Firewall protects `yourdomain.com` + `www.yourdomain.com`
- `admin.yourdomain.com` is protected by Cloudflare Access
- In Vercel, you can add a simple `Bypass - Admin Host` rule so Vercel doesn’t try to challenge admin traffic again

---

### Recommended Vercel Settings

**Vercel → Project → Firewall → Bot Management**

- **Bot Protection:** `Challenge requests from non-browser sources, excluding verified bots`

---

## Custom Rules (order matters)

Place rules in this order (top → bottom):

1. Bypass – Admin Host
2. Bypass – License Server API (IP + /api/)
3. Bypass – Functional Paths (host-scoped)
4. Deny – Enforce Production Domains (block `*.vercel.app`)
5. Deny – Block Junk & Scanners (regex)
6. Rate Limit – Critical endpoints
7. Rate Limit – Auth endpoints

---

### Rule 00 — Bypass Admin Host

**Name:** `Bypass - Admin Host`  
**Action:** `Bypass`

**IF (AND):**

- **Hostname** `equals` `admin.yourdomain.com`

**Why:**  
If you protect `admin.yourdomain.com` with Cloudflare Access / Zero Trust, let that gate be the primary bouncer.

---

### Rule 01 — Bypass License Server API (Server-to-Server)

**Name:** `Bypass - License Server API`  
**Action:** `Bypass`

**IF (AND):**

- **Environment** `equals` `Production`
- **Hostname** `is any of`:
  - `yourdomain.com`
  - `www.yourdomain.com`
- **Request Path** `starts with` `/api/`
- **IP Address** `is any of` `YOUR_LICENSE_SERVER_IP/32`

**Example IP CIDR:** `158.69.212.133/32`

- `/32` means “exactly one IPv4 address”.

**Why:**  
Bot protection and managed rules can break automation. This bypass keeps your trusted backend working while still challenging everyone else.

---

### Rule 02 — Bypass Functional Paths (Host-scoped)

**Name:** `Bypass - Functional`  
**Action:** `Bypass`

> Vercel’s rule UI often forces you to repeat hostnames per OR-branch. Configure this as OR branches like below:

**Branch A**

- Request Path `starts with` `/.well-known/`
- AND Hostname `is any of`:
  - `yourdomain.com`
  - `www.yourdomain.com`
  - `admin.yourdomain.com`

**Branch B**

- Request Path `starts with` `/_app/`
- AND Hostname `is any of` (same 3)

**Branch C**

- Request Path `equals` `/robots.txt`
- AND Hostname `is any of` (same 3)

**Branch D**

- Request Path `equals` `/favicon.ico`
- AND Hostname `is any of` (same 3)

**Why:**  
These “plumbing” routes should not be challenged. The hostname scope prevents bypassing on random `*.vercel.app` hosts.

---

### Rule 03 — Enforce Production Domains (Block `*.vercel.app`)

**Name:** `Enforce Production Domain`  
**Action:** `Deny`

**IF (AND):**

- **Hostname** `is not any of`:
  - `yourdomain.com`
  - `www.yourdomain.com`
  - `admin.yourdomain.com`
- AND **Environment** `equals` `Production`

**Why:**  
This blocks direct access via Vercel’s default deployment domains (and any other unexpected hosts).

---

### Rule 04 — Block Junk & Scanners (Single Regex Deny)

**Name:** `Block Junk & Scanners`  
**Action:** `Deny`  
**Field:** `Request Path`  
**Operator:** `matches expression` (regex)

**Value (copy/paste):**

```regex
.*\.(php|asp|aspx|jsp|cgi|env|git|ini|config|bak|sql|sqlite|log|sh|swp|yaml|yml|action)$|\/(wp-|wp\/|xmlrpc|phpmyadmin|pma\/|myadmin|alfa_data|fckeditor|phpunit|sftp-config|laravel|_ignition|\.ssh\/|\.aws|id_rsa|id_dsa|\.ds_store|\.vscode\/|server-status|manager\/html|solr\/admin|actuator|backup|old\/|install\/|temp\/|components\/|modules\/|admin\/uploads|admin\/images|site\/|public\/|plugins\/|include\/|local\/|shop\/|magento|ecp\/|v2\/_catalog|_all_dbs$|s\/[^\/]+\/_\/;?\/META-INF\/|https?%3A)|^/\.well-known/.*\.php(?:$|\?)
```

**Why:**  
Drops common exploit/scanner paths at the edge:

- WordPress probes, phpMyAdmin, xmlrpc, ignition, laravel, etc.
- dotfiles/secrets (`.env`, `.git`, `.vscode`, keys)
- infra probes (`server-status`, `_all_dbs`, `v2/_catalog`, `ecp/`)
- encoded “URL in the path” probes (`https%3A...`)
- blocks `.php` payloads under `/.well-known/` **without** blocking legit `/.well-known/security.txt`.

---

### Rule 05 — Rate Limit Critical API Endpoints

**Name:** `Rate Limit - validate + report-error`  
**Action:** `Rate Limit`

**Window:** `10s`  
**Limit:** `20`  
**Request Path** `matches expression`:

```regex
^/(api/report-error|api/v1/validate)/?$
```

---

### Rule 06 — Rate Limit Auth (Optional but recommended)

#### 06A — Sign-in brute force

**Name:** `Rate Limit - sign_in`  
**Action:** `Rate Limit`

**IF (AND):**

- Request Path `equals` `/login/sign_in`
- Method `equals` `POST`

Suggested: `10 per 60s`

#### 06B — Sign-up spam

**Name:** `Rate Limit - sign_up`  
**Action:** `Rate Limit`

**IF (AND):**

- Request Path `equals` `/login/sign_up`
- Method `equals` `POST`

Suggested: `6 per 60s`

---

## Notes / Gotchas

- Seeing `/.well-known` (directory) return 404 is normal. What matters is specific files like:
  - `/.well-known/security.txt`
  - `/.well-known/acme-challenge/<token>` (only during cert issuance)
- Don’t use **System Bypass Rules** unless you _know_ you want to bypass Vercel’s system mitigations (and accept billing implications). Use **Custom Rules → Bypass** instead.
