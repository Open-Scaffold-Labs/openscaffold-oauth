// openscaffold-oauth — entry point.
// Boots an Express app, mounts oidc-provider, and serves a minimal login +
// consent UI for the OAuth authorization code flow.

const express = require('express');
const bodyParser = require('body-parser');
const Provider = require('oidc-provider').default || require('oidc-provider');
const config = require('./config');
const { authenticate } = require('./account');

const PORT = Number(process.env.PORT) || 4000;
const ISSUER = process.env.ISSUER || `http://localhost:${PORT}`;

async function main() {
  const provider = new Provider(ISSUER, config);
  provider.proxy = true; // we'll sit behind a reverse proxy in production

  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', require('path').join(__dirname, 'views'));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  /* ── Custom login + consent ────────────────────────────────────────── */
  app.get('/interaction/:uid', async (req, res, next) => {
    try {
      const details = await provider.interactionDetails(req, res);
      const { prompt, params, uid } = details;

      if (prompt.name === 'login') {
        return res.render('login', { uid, params, error: null });
      }
      if (prompt.name === 'consent') {
        return res.render('consent', {
          uid,
          params,
          scopes: (params.scope || '').split(/\s+/).filter(Boolean),
          clientName: details.client?.clientName || params.client_id,
        });
      }
      res.status(400).send(`Unknown prompt: ${prompt.name}`);
    } catch (err) {
      next(err);
    }
  });

  app.post('/interaction/:uid/login', async (req, res, next) => {
    try {
      const details = await provider.interactionDetails(req, res);
      const { username, password } = req.body;
      const accountId = await authenticate(username, password);
      if (!accountId) {
        return res.render('login', {
          uid: req.params.uid,
          params: details.params,
          error: 'Invalid credentials',
        });
      }
      const result = { login: { accountId } };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
      next(err);
    }
  });

  app.post('/interaction/:uid/confirm', async (req, res, next) => {
    try {
      const details = await provider.interactionDetails(req, res);
      const { prompt, session, params } = details;
      const grant = details.grantId
        ? await provider.Grant.find(details.grantId)
        : new provider.Grant({ accountId: session.accountId, clientId: params.client_id });

      const requestedScopes = (params.scope || '').split(/\s+/).filter(Boolean);
      grant.addOIDCScope(requestedScopes.filter((s) => ['openid', 'profile', 'email', 'offline_access'].includes(s)).join(' '));
      // Resource server scopes
      const rsScopes = requestedScopes.filter((s) => s.startsWith('openlawfirm:'));
      if (rsScopes.length) {
        grant.addResourceScope('openlawfirm', rsScopes.join(' '));
      }
      const grantId = await grant.save();
      const result = {
        consent: { grantId },
      };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
    } catch (err) {
      next(err);
    }
  });

  app.post('/interaction/:uid/abort', async (req, res, next) => {
    try {
      const result = { error: 'access_denied', error_description: 'End-user aborted interaction' };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
      next(err);
    }
  });

  /* ── Healthcheck ──────────────────────────────────────────────────── */
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'openscaffold-oauth', version: '0.1.0', issuer: ISSUER });
  });

  /* ── Mount oidc-provider as the catch-all ─────────────────────────── */
  app.use(provider.callback());

  app.listen(PORT, () => {
    console.log(`\n🔐 openscaffold-oauth listening on ${ISSUER}`);
    console.log(`   Discovery:   ${ISSUER}/.well-known/openid-configuration`);
    console.log(`   JWKS:        ${ISSUER}/jwks`);
    console.log(`   Authorize:   ${ISSUER}/auth`);
    console.log(`   Token:       ${ISSUER}/token`);
    console.log(`   Health:      ${ISSUER}/health\n`);
  });
}

main().catch((err) => {
  console.error('openscaffold-oauth startup failed:', err);
  process.exit(1);
});
