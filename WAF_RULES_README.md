# Cloudflare WAF starter rules for Signal Lynx Key Commander style sites

This doc captures a practical Cloudflare WAF setup that blocks the constant background noise (CMS probes, config grabs, traversal, random admin panels) without relying on Basic Bot Fight Mode.

Important note on Bot Fight and Key Commander:  
Basic Bot Fight Mode (Cloudflare and Vercel) can break legitimate server to server traffic between a frontend and a backend (for example, this website calling a Key Commander server). These rules are a lightweight alternative that plays nicer with backend calls.

Scope  
Domain: yourdomain.com and www.yourdomain.com  
Rules type: Security rules (Custom rules) plus Rate limiting rules  
Order matters. Follow the rule order below.

Remember - Security is an ongoing battle; Monitor the safety of your site and update your security rules and settings accordingly.

---

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

(http.host in {"yourdomain.com" "www.yourdomain.com"}) and not cf.client.bot and (
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

(http.host in {"yourdomain.com" "www.yourdomain.com"}) and not cf.client.bot and (
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

(http.host in {"yourdomain.com" "www.yourdomain.com"}) and not cf.client.bot and starts_with(lower(http.request.uri.path), "/admin")

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

(http.host in {"yourdomain.com" "www.yourdomain.com"}) and (
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

(http.request.uri.path contains "/api/v1/validate") or (http.request.uri.path contains "/report-error")

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
