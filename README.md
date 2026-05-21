# openscaffold-oauth

Shared OAuth 2.0 + OpenID Connect authorization server for the Open Scaffold Labs ecosystem. One auth surface, many resource servers (OpenLawFirm, OpenFirehouse, OpenRestaurant, ...). Built on [`oidc-provider`](https://github.com/panva/node-oidc-provider).

See [docs/oauth-design.md](https://github.com/Open-Scaffold-Labs/OpenLawFirm/blob/main/docs/oauth-design.md) in the OpenLawFirm repo for the architectural rationale.

## Status

**v0.1 — local development.** Working end-to-end against the shared `openfirehouse` PostgreSQL database. Production deployment (`auth.openscaffoldlabs.com`) still pending.

## What it provides

- OAuth 2.0 Authorization Code flow with PKCE (mandatory for all clients)
- Refresh token rotation
- JWT access tokens signed with RS256
- JWKS endpoint for resource servers to validate signatures locally
- OpenID Connect Discovery metadata at `/.well-known/openid-configuration`
- Token introspection (RFC 7662) and revocation (RFC 7009)
- Scope namespace per Open Scaffold convention: `<vertical>:<resource>:<action>`
- Custom login + consent UI in Open Scaffold brand colors

## Run locally

```bash
cd ~/Projects/openscaffold-oauth
npm install
cp .env.example .env
npm start
```

Server starts on `http://localhost:4000`. Discovery:

```
http://localhost:4000/.well-known/openid-configuration
```

## OAuth clients

For development, one client is pre-registered:

| `client_id` | Purpose | Redirect URIs |
|---|---|---|
| `openlawfirm-mcp-claude-connector` | OpenLawFirm MCP server for Claude | `https://claude.ai/api/mcp/auth_callback`, `http://localhost:8765/callback` |

## Scopes

OpenLawFirm scopes (v0.1):

- `openlawfirm:matter:read`
- `openlawfirm:matter:write`
- `openlawfirm:time:write`
- `openlawfirm:document:read`
- `openlawfirm:invoice:read`
- `openlawfirm:trust:read`
- `openlawfirm:calendar:read`

OIDC scopes also supported: `openid`, `profile`, `email`, `offline_access`.

## Test flow

```bash
# 1. Start the server
npm start

# 2. In a browser, hit the authorize endpoint with PKCE.
#    The /scripts/test-auth-flow.sh helper handles PKCE generation.

# 3. Sign in (use the seed user attorney / lawfirm1234 from OpenLawFirm)
# 4. Approve scopes on the consent screen
# 5. Receive an authorization code at the redirect URI
# 6. Exchange code for access token via POST /token
```

## Database

Uses the shared `users` table in the `openfirehouse` database. Reads only — does not modify user records. OAuth state (grants, sessions, refresh tokens) is in-memory in v0.1; will migrate to PostgreSQL-backed adapter for production.

## Production hardening checklist

Items to address before deploying to `auth.openscaffoldlabs.com`:

- [ ] Replace the in-memory adapter with a PostgreSQL adapter
- [ ] Persistent JWKS (generate once, store securely, rotate on schedule)
- [ ] HTTPS-only with valid TLS certificate
- [ ] Secure cookies (httpOnly, secure, sameSite=lax)
- [ ] Rate limiting on `/auth` and `/token`
- [ ] 2FA enforcement (initially opt-in, then mandatory)
- [ ] Audit logging of every OAuth grant to a write-only log table
- [ ] Backup and disaster recovery for the JWKS keypair

## License

MIT — see [LICENSE](../OpenLawFirm/LICENSE).
