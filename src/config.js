// oidc-provider configuration for the Open Scaffold ecosystem.
//
// Scopes namespace: <vertical>:<resource>:<action>
//   openlawfirm:matter:read, openlawfirm:time:write, etc.
//   Future verticals: openfirehouse:incident:read, openrestaurant:order:write, etc.

const { findAccount } = require('./account');

const OLF_REDIRECT_URIS = (process.env.OLF_MCP_REDIRECT_URI || 'http://localhost:8765/callback')
  .split(',')
  .map((s) => s.trim());

const OLF_CLIENT_ID = process.env.OLF_MCP_CLIENT_ID || 'openlawfirm-mcp-claude-connector';

// OAuth clients registered with this provider. Public clients (Claude is a
// public client per the MCP spec) use PKCE and have no client_secret.
const clients = [
  {
    client_id: OLF_CLIENT_ID,
    client_name: 'OpenLawFirm Connector for Claude',
    redirect_uris: OLF_REDIRECT_URIS,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none', // public client, PKCE required
    application_type: 'web',
    scope:
      'openid profile email ' +
      'openlawfirm:matter:read openlawfirm:matter:write ' +
      'openlawfirm:time:write openlawfirm:document:read ' +
      'openlawfirm:invoice:read openlawfirm:trust:read ' +
      'openlawfirm:calendar:read offline_access',
  },
];

const config = {
  clients,
  findAccount,
  cookies: {
    keys: [process.env.COOKIE_SECRET || 'dev-cookie-secret-do-not-use-in-prod'],
  },
  claims: {
    openid: ['sub'],
    profile: ['username', 'name', 'role'],
    email: ['email'],
    'openlawfirm:matter:read': [],
    'openlawfirm:matter:write': [],
    'openlawfirm:time:write': [],
    'openlawfirm:document:read': [],
    'openlawfirm:invoice:read': [],
    'openlawfirm:trust:read': [],
    'openlawfirm:calendar:read': [],
  },
  pkce: {
    required: () => true, // PKCE mandatory for every client
    methods: ['S256'],
  },
  features: {
    devInteractions: { enabled: false }, // we render our own login + consent
    introspection: { enabled: true },
    revocation: { enabled: true },
    // Resource indicators (RFC 8707) deferred to a future release — we'll
    // enable when there are multiple verticals' resource servers and we need
    // to disambiguate audiences. For v0.1 the access token's audience is
    // implicit (openlawfirm-mcp is the only consumer).
  },
  // Issue JWT access tokens by default (matches MCP server expectations).
  formats: {
    AccessToken: 'jwt',
  },
  scopes: [
    'openid', 'profile', 'email', 'offline_access',
    'openlawfirm:matter:read', 'openlawfirm:matter:write',
    'openlawfirm:time:write', 'openlawfirm:document:read',
    'openlawfirm:invoice:read', 'openlawfirm:trust:read',
    'openlawfirm:calendar:read',
  ],
  ttl: {
    AccessToken: 15 * 60,        // 15 min
    AuthorizationCode: 10 * 60,  // 10 min
    IdToken: 60 * 60,            // 1 hour
    RefreshToken: 30 * 24 * 60 * 60, // 30 days
  },
};

module.exports = config;
