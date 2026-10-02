# Open Scaffold sign-in audit

Date: 2026-10-02. Read-only review of Open-Scaffold-Labs repos pushed on or after 2026-05-01 that are apps or shared services with a caller. No app code, secrets, or deploys were changed. Evidence is the auth files, env examples (names only), and deploy config in each repo. Hosts were not logged into, and production databases were not queried, so “live” means a deploy target or a documented URL, not a user count.

Full rows are in `docs/audit/2026-10-sign-in-inventory.csv`.

## What openscaffold-oauth is

It is a small OAuth 2.0 and OpenID Connect **authorization server** (`oidc-provider` 8, Express, v0.1.0). It is not the sign-in screen the apps use today.

Implemented and working in local code:

- Authorization Code with PKCE (S256 required for every client).
- Refresh tokens, JWT access tokens (RS256), JWKS, discovery, introspection, and revocation.
- TTLs: access 15 minutes, code 10 minutes, id token 1 hour, refresh 30 days.
- One public client, `openlawfirm-mcp-claude-connector` (Claude MCP redirects).
- Username and password login against the shared OpenFirehouse `users` table (`passwordHash` or `password`, bcrypt). Consent screen grants every requested scope. Login and consent are server-rendered EJS, not the design system.

Not implemented (README production checklist is still open): persistent token store (grants and sessions are in memory), stable JWKS across restarts, rate limits, MFA, audit log, password reset, Google, Apple, magic link, or passkeys. Resource indicators are deferred. The cookie secret falls back to a dev string when unset.

**Who calls it.** OpenLawFirm’s MCP server validates these JWTs via JWKS and then mints its own short app JWT. The law-firm app’s own login does not redirect here. `openscaffold-doc-bridge` names this service in an architecture note and has no code. No other in-scope app references the issuer.

**Deployed.** There is no `fly.toml` or `vercel.json`. `https://auth.openscaffoldlabs.com/health` and `/.well-known/openid-configuration` both return HTTP 404, so this process is not serving that host.

## How apps sign in today

Almost every product invented its own username (or email) plus bcrypt (or scrypt) password and an HS256 JWT. Supabase, when present, is usually Postgres or Realtime, not Supabase Auth. Google and Apple are used to connect a mailbox, calendar, or YouTube channel after the person is already signed in. They are not “Sign in with Google.”

Three patterns cover the estate:

1. **Custom app JWT.** OpenFirehouse, OpenChurch, OpenLandscapeBusiness, OpenLandscapeArchitect, OpenInteriorDesign, OpenSalon, OpenRestaurant, OpenLawFirm, OpenCreator, OpenCPA, vadevi-admin, and the design-studio apps. Sessions are a mix of `localStorage` access tokens and httpOnly refresh cookies. MFA exists only in open-hoa (TOTP, required for admin and treasurer) and OpenCPA (TOTP step-up). OpenFirehouse removed its authenticator step.
2. **Supabase Auth, each app on its own project.** lockstreet (email/password), fusion-recipe-builder (email/password), open-caterer (magic link for provisioned staff), artmarket (password or magic link). OpenPrePlan has a server-side Supabase bearer check and no login screen.
3. **No person account.** FireHazmat (department license), OpenPlants (browser plan flag), RoomStudio hosted pilot (one shared password), the three fire wedges (shared API token or open), marketing sites, and the shared libraries.

There is no shared person id. A landscape owner, a chief, and a parish admin are three password rows in three databases. open-hoa is the only app whose session length and MFA already match the spec below.

## Inventory

Effort is the work to adopt the shared sign-in: **S** swap a thin login, **M** replace a custom user table and keep roles, **L** production tenancy or a second credential (crew PIN, rig login).

| App | Sign-in today | Store | Live target | Effort |
|---|---|---|---|---|
| OpenLandscapeBusiness | Username/password + crew phone PIN; DB lockout; 15-min access JWT; httpOnly refresh | Postgres on Fly (Neon driver present) | open-landscape-business.fly.dev (machine kept on; demo operator) | L |
| OpenLandscapeArchitect | Username/password; 15-min JWT; httpOnly refresh; no lockout | Postgres on Fly | open-landscape-architect.fly.dev | M |
| OpenPlants | No accounts; Free/Pro is a browser flag | None (catalog via OLA) | open-plants.fly.dev | M |
| OpenFirehouse-private | Username/password, unit and rig logins; lockout; short web JWT in localStorage; httpOnly refresh. MFA removed | Supabase Postgres, RLS via app GUCs | openfirehouse.openscaffoldlabs.com | L |
| OpenFirehouseMobile | Same API; JWT in the device keychain | None (API client) | App Store build of that API | M |
| OpenFirehouse | Public snapshot; auth description lags the private repo | Same product DB | Mirror only | — |
| OpenChurch | Email/password; 7-day httpOnly cookie; open parish signup creates admin; reset email | Shared Supabase Postgres (`ochr_*`) | Vercel (health workflow) | L |
| openchurch-core | Public snapshot; JWT still in localStorage | Same, refs stripped | Snapshot only | — |
| open-hoa | Email/password; TOTP; idle limits by role; reset | Neon intended; local SQLite | Vercel project, host not confirmed | L |
| open-caterer | Supabase magic link; shared operator token | Supabase; API uses service role | open-caterer.vercel.app | M |
| OpenRestaurant | Username/password; 24h JWT in localStorage | Postgres on Vercel | Vercel project `open-restaurant` | L |
| vadevi-admin | Username/email + password; first user is admin | Postgres; Supabase is photo storage | vadevi-admin.fly.dev | S |
| fusion-recipe-builder | Supabase email/password; open signup; guest mode | Supabase Auth + RLS on `auth.uid()` | Vercel | M |
| OpenSalon | Username/password; signup creates the salon owner; refresh rotation | Supabase pooler; app tables `hs_*` | No deploy file | L |
| OpenInteriorDesign | Username/password; signup accepts a client-supplied role | Postgres | Vercel rewrite | M |
| RoomStudio | One shared pilot password | Vercel Blob | room-studio-pilot.vercel.app | S |
| open-property-developer | Email + scrypt; cookie session; CLI reset | SQLite | open-property-developer.fly.dev (demo) | M |
| lockstreet | Supabase email/password and reset; extra admin password header | Supabase + RLS | `lockstreet.app` named in env examples | S |
| the-match | Email + 4-digit PIN; 90-day JWT | Postgres (pooler) | Vercel | L |
| OpenLawFirm | App username/password JWT. MCP separately checks openscaffold-oauth | Shared `users` table | Local; production called pending | M |
| OpenCPA | Staff password + TOTP; client magic link | Own Postgres (Compose) | Self-host | M |
| OpenCreator | Username/password; 7-day JWT | Postgres | Placeholder Railway URL | M |
| OpenMusicLover | Login against seeded users | Postgres | Vercel + Railway files, no host | M |
| artmarket | Supabase password or magic link; browser picks the role | Supabase | No deploy file | M |
| OpenDesignStudio | Username/password; 30-day JWT | Postgres (`openfirehouse` default) | Vercel | M |
| open-design-studio | Email + scrypt; JWT; JSON file store | File (SQL migration unused) | Vercel rewrite | M |
| limitless-stack-hub | GitHub OAuth, org membership; PAT for agents | Supabase pooler | limitless-stack-hub.vercel.app | M |
| FireHazmat | No person login; department license JWT | Own Supabase; RLS deny-all | firehazmat.openscaffoldlabs.com | L |
| OpenFireInspector | No user login; optional shared bearer | OpenFirehouse Postgres | Vercel rewrite only | M |
| OpenIncidentCosts | Same | OpenFirehouse Postgres | Vercel rewrite only | M |
| OpenPrePlan | README says none; server can check Supabase or a shared bearer. UI has no form | OpenFirehouse Postgres | Vercel rewrite only | M |
| opendiocese | README only | — | — | L |
| openscaffoldlabs-site | Contact form only | Resend | Marketing site | — |
| LimitlessStack | Operator scripts, no product login | — | — | — |
| openscaffold-oauth | OIDC server; one MCP client; in-memory grants | OpenFirehouse `users` | Not deployed | Foundation |
| openscaffold-core | JWT helper + localStorage client. No login component | — | Library | M |
| openscaffold-kernel | `signToken` / `hashPassword` primitives | — | Library | M |
| openscaffold-books | Vertical API key | Postgres; RLS denies anon | Not stood up | M |
| openscaffold-billing | Vertical API key; Stripe hosts the payer | Supabase RLS by vertical claim | Not stood up | M |
| openscaffold-website | Host app passes `authMiddleware` | Host DB | Library | S |
| openscaffold-plants | Catalog client; optional service bearer | — | Library | — |
| openscaffold-plants-ui | Care panel; no network | — | Library | — |
| osl-ai | Host `authorize()` callback | — | Library | S |
| openscaffold-doc-bridge | Architecture note only | — | Docs | S |
| openscaffold-integrations | Adapter library | — | Library | — |

## Security issues

Ordered by how directly a stranger can become an admin or read another tenant. Values of keys and demo passwords are omitted on purpose.

1. **OpenInteriorDesign** `POST /api/auth/signup` writes `req.body.role` into `oia_users` (default `designer`). A caller can register as `admin`. Password minimum is 6 characters. Access JWT is 24 hours (`server/src/index.js`).
2. **Fire wedges.** OpenFireInspector and OpenIncidentCosts serve the API with no user when `API_ACCESS_TOKEN` is unset off Vercel (`server/src/index.js`). On Vercel one shared bearer is the only gate. OpenPrePlan can do the same, and `server/src/auth.js` inserts a fixed demo invite for department 1. Creating a department makes the caller admin.
3. **OpenDesignStudio** falls back to a hard-coded `JWT_SECRET`, issues 30-day tokens, leaves CORS open, and disables DB TLS verification in production (`server/src/index.js`).
4. **the-match** uses a 4-digit PIN, stores a 90-day JWT in `localStorage`, stores reset tokens in plaintext, and only `console.log`s the reset link. The limiter is in memory (`server/src/routes/auth.js`).
5. **OpenLandscapeBusiness** signs with a hard-coded dev secret if `JWT_SECRET` or `JWT_REFRESH_SECRET` is unset (`server/src/routes/auth.js`). `server/fly.toml` sets `OLB_OPERATOR=demo` and does not set `OLB_DEMO=0`, so demo office logins stay on the public web app. RLS is enabled with no policies; the API role owns the tables.
6. **OpenLandscapeArchitect** treats a missing token as a hard-coded principal when `NODE_ENV` is not production, has the same dev JWT fallback, has no login throttle, and sets the production refresh cookie `SameSite=None` (`server/src/middleware/auth.js`). Plant and weed GETs stay public until a service token is set.
7. **OpenFirehouse-private.** Access JWT and the paired-device token sit in `localStorage` (`client/src/utils/api.js`). Authenticator MFA was removed. Demo departments skip the account lock. `OpenFirehouseMobile` ships a hard-coded Supabase anon JWT fallback (`src/lib/realtime.ts`). The public OpenFirehouse and openchurch-core trees lag the private cookie and lockout fixes.
8. **OpenChurch.** Parish self-signup inserts the founder as `admin`. RLS is turned on and no policies are defined; the app connects as table owner (`server/src/migrations/080-rls-sweep.js`). Rate limits are per serverless instance. The public snapshot still stores `ochr_token` in `localStorage`.
9. **fusion-recipe-builder** can create users with email confirmation skipped, returns the refresh token to the browser, and honors a `?demo=1` bypass (`api/_auth.js`, `static/composer-auth.js`).
10. **OpenLawFirm** has no login throttle. Any authenticated user can read and write settings; `requireRole` is defined and not applied to the routers (`server/src/routes/settings.js`). The login page renders demo credentials.
11. **vadevi-admin and OpenCreator** fall back to a hard-coded JWT secret. vadevi keeps signup open after the first admin (later users are `staff`) and has no rate limit. Both store the access token in `localStorage`.
12. **OpenRestaurant** has a committed env backup at `server/.env.bak.1776297781` (contents not opened for this audit) and a non-production route that resets every password. Access JWT is in `localStorage`. There is no per-account lockout.
13. **lockstreet** accepts `x-admin-password` equal to `ADMIN_PASSWORD` as an admin bypass beside the Supabase role (`api/_utils.js`).
14. **open-hoa** is the strongest sign-in, with two gaps: `EsignSeal` RLS policies allow public insert and select (`prisma/rls.postgres.sql`), and sign-in limits are skipped if the attempt table is missing. A Neon owner connection bypasses RLS. The login page prints the demo password when `DEMO_LOGIN_HINT` is on.
15. **limitless-stack-hub** puts the access JWT in the URL hash and `localStorage`. Org removal does not revoke the current JWT. Personal access tokens have no expiry.
16. **artmarket** lets the browser choose and store `profiles.role`. If Supabase env is missing, the client mock reports a successful sign-in (`lib/supabase.js`).
17. **open-design-studio** has no login rate limit. Its unused SQL policies are `using (true)` on players, contests, and payouts.
18. **OpenCPA** returns the TOTP secret in the setup JSON. Staff have no password-reset flow. Compose ships a fixed local database password.
19. **RoomStudio** pilot is one shared password with no lockout (`api/pilot.js`).
20. **openscaffold-books / openscaffold-billing.** Caller auth is a static env API key. If the billing JWT secret is unset, queries use the service role and skip RLS.
21. **openscaffold-oauth.** In-memory grants, dev cookie-secret fallback, no rate limit, and a single global `users.role` claim. Safe only because it is not deployed.

Repeated across the custom-JWT apps: access tokens in `localStorage`, in-memory rate limits that reset on a cold start, no MFA, and RLS either absent or enabled with zero policies while the app connects as owner. Service-role keys showed up in server env examples (OpenFirehouse, open-caterer, lockstreet, fusion-recipe-builder), not in client bundles, except the FireHazmat and OpenFirehouse mobile anon keys, which are publishable by design.

## Recommendation

**Use a hybrid.**

One human identity, issued by **Supabase Auth on a single Open Scaffold project**: Sign in with Google, Sign in with Apple, and email magic link. That project already knows how to do those three, plus optional passkeys and TOTP, and it gives Postgres a stable `auth.uid()`. Several apps already speak this API (lockstreet, fusion-recipe-builder, open-caterer, artmarket). Point them at the shared project instead of growing more custom password tables.

Keep **openscaffold-oauth** as the authorization server for other people’s software (the OpenLawFirm MCP client, later connectors). It should stop checking the OpenFirehouse `users` password. After the person signs in with the shared identity, this server issues the scoped access token (PKCE, JWKS, `<vertical>:<resource>:<action>`). Building Google, Apple, magic link, passkeys, and MFA inside oidc-provider would copy Supabase Auth and still leave forty apps to become OAuth clients on day one.

App passwords, crew PINs, and rig logins stay out of the identity. The identity answers “who is this person.” The app answers “which company, and which role.”

### Sign-in spec

- Buttons: Google, Apple, and “Email me a link.” Password login is a migration bridge, then removed.
- Passkeys: optional, phase 2, same account.
- MFA (TOTP): required for admin, owner, chief, treasurer, partner, and platform-operator roles. Grace window, then the session cannot call privileged routes. Recovery codes hashed at rest. open-hoa’s `security-policy.ts` is the template.
- Sessions: access token 15 minutes, held by the app server. Refresh in an httpOnly, Secure, SameSite=Lax cookie. Privileged roles: 30-minute idle, 12-hour absolute. Everyone else: 12-hour idle, 14-day absolute. Rotation and reuse detection, as OpenLandscapeBusiness already does in `olb_auth_sessions`.
- Rate limits, stored in the database: 8 failures per account per 15 minutes, 40 per IP per 15 minutes. Lock is per account and survives a new serverless instance.
- Audit log, append-only: sign-in, failure, reset, MFA enroll, role change, session revoke.
- Signup never accepts a role from the client. The first owner of a new tenant is assigned by the server. Extra admins are invited.
- No service-role key and no anon key with table access in a browser bundle. Browser Supabase clients, if any, are Realtime-only with deny-all RLS.

### Shared package

`@openscaffold/auth`, styled from `openscaffold-design` (tokens, `.os-button`, `.os-input`). That repo has no login component today.

- Drop-in React screen: Google, Apple, magic link, and the MFA prompt.
- App server helpers: verify the Supabase session, set the httpOnly cookie, map `auth.users.id` to the app membership, `requireRole`.
- The screen does not know about crew PINs, rig accounts, or vertical API keys. Those stay in the host app, bound to a tenant, and cannot mint a human session.

### Account model

- One Open Scaffold person: `auth.users.id` (UUID) and a verified email.
- Per app, a membership row: person id, tenant id (company, department, parish, firm, association), role.
- A person can belong to many apps and many tenants. Roles do not leak across apps. The old `users.role` column on the OpenFirehouse table is not the ecosystem role.
- Service credentials (books and billing API keys, plants service bearer, cron secrets) are a second channel. They never satisfy `requireRole`.

### Rollout

Build the shared project, the package, and the oauth bridge before any app cutover. Then:

1. **OpenLandscapeBusiness (L).** It is the live Fly app with a real session design (15-minute access, rotating refresh, DB lockout). Move office users (owner, manager) onto the shared identity first. Keep crew phone+PIN as a company credential. Fix the dev-secret fallback and the public demo buttons in the same change.
2. **Already on Supabase Auth (S–M):** lockstreet, fusion-recipe-builder, open-caterer, artmarket. Repoint the project, turn off open signup and the admin-password header, and stop storing refresh tokens in `localStorage`.
3. **Thin custom logins (S–M):** vadevi-admin, RoomStudio, OpenCreator, OpenMusicLover, OpenDesignStudio, open-design-studio, OpenInteriorDesign. Interior design gets the signup-role fix immediately, even before the shared screen.
4. **OpenLandscapeArchitect (M),** then OpenSalon and OpenRestaurant (L). Same JWT shape as Business, with salon/restaurant tenancy.
5. **open-hoa (L).** Keep its TOTP and privileged-session rules; swap the password check for the shared identity. Repair the `EsignSeal` policies first.
6. **OpenChurch (L),** then **OpenFirehouse plus mobile (L).** These have production tenants, invites, and (for the fire app) unit and rig logins that must remain app-local. Do them after the package has survived Business. Retire the public snapshots’ localStorage sessions by republishing, not by a separate migration.
7. **Close the wedges (M):** OpenFireInspector, OpenIncidentCosts, OpenPrePlan call the fire API instead of a shared bearer.
8. **OpenCPA (M)** and **OpenLawFirm app login (M).** The MCP client stays on openscaffold-oauth and starts trusting the shared identity.
9. **No person migration:** plants packages, website, kernel, core (update the helper), books, billing, integrations, osl-ai, doc-bridge, LimitlessStack, the marketing site, FireHazmat licenses, opendiocese (empty). Hub’s GitHub login can later accept the same person id; it is an operator console, not a customer app.

## Skipped

Not apps, pushed on or after 2026-05-01: `composing-a-menu`, `demo-repository`, `Flavor_Architecture`, `lens-platform`, `open-scaffold-docs`, `openscaffold-design` (tokens only; the style source for the package), `open-landscape-business-site`, `openscaffold-wiki`, `china-book`. `paperclip` is a third-party agent-orchestrator fork, not an Open Scaffold customer app, and was left out of the requested list.

Pushed before 2026-05-01 and not reviewed: Freestation, Could-not-load-schedule-Load-failed, openscaffold-canvas, openscaffold-field, openscaffold-measure, openscaffold-space-planner, PowerPoint-Brochures, openscaffold-site, interior-design-site, landscape-architect-site, openservice-site, open-assistant-site, OpenRestaurant-old-scaffold, openscaffold-generator, open-caterer-site, OpenFirehouseField, OpenPropertyManager, OpenDeveloper, OpenAgency, OpenScaffold, OpenShop, OpenMeasure, OpenShare, OpenChiropractor, open-personal-assistant, clear-insight-flag, ChefAssistant, open-dentist-assistant, clearsight-dental, OpenTimeSheet, openscaffold-pdf, OpenDesignHome, openmenu.
