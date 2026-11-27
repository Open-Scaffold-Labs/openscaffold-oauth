# AGENTS.md — openscaffold-oauth

## What this is

Shared OAuth 2.0 + OpenID Connect authorization server for the Open Scaffold Labs ecosystem: one auth surface, many resource servers.

**Status: v0.1, local development.** Production hosting is not done in this slice. Features include Authorization Code + PKCE (mandatory), refresh-token rotation, RS256 JWT access tokens, JWKS, OIDC discovery, introspection (RFC 7662), and revocation (RFC 7009). Scopes follow `<vertical>:<resource>:<action>`.

This is an auth server. Changes to tokens, keys, or login/consent need a `docs/security-decisions.md` entry and careful review.

## Stack

- Node 20+
- Express + PostgreSQL (`pg`)
- `src/index.js`; config from `.env` (see `.env.example`)

## Install / run / test / build

```bash
npm install
cp .env.example .env    # point at a local Postgres; never commit real secrets
npm start               # node src/index.js  — http://localhost:4000
npm run dev             # node --watch src/index.js
```

Discovery: `http://localhost:4000/.well-known/openid-configuration`.

There is no test or build script in `package.json`. If you change protocol behavior, add tests in the same PR.

## CI

No GitHub Actions workflow is in the repo today. Note that on the PR.

## Shared @openscaffold modules

None declared in `package.json`. This server is the shared auth surface; resource servers live in other repos.

## OSL engineering rules

These apply to every Open Scaffold Labs repo:

- **PRs only.** Do not push to the default branch (`main` or `master`). Open a pull request.
- **CI must be green** before merge. Never merge over red.
- **zod `.strict()`** on every write route (POST / PUT / PATCH / DELETE bodies).
- **Attack harness** on every route: auth bypass, tenant crossover, oversized and unknown fields, injection. Required once the app has real users; recommended for prototypes.
- **`docs/security-decisions.md` entry** (reviewed) for any change to headers, auth, or deploys.
- **No competitor names** in code, seed data, comments, or UI copy.
- **Never commit secrets.** No API keys, tokens, credentials, cookies, or magic links. Keep `.env` and real values out of git, PR text, and chat. Commit only `.env.example` with placeholders.

A production deploy, paid account, env/credential change, or merge that auto-deploys to production needs Dale's own yes.
