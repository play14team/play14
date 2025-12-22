module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  forgotPassword: {
    from: 'admin@play14.org',
    replyTo: 'admin@play14.org',
  },
  watchIgnoreFiles: [
    '**/config/sync/**',
    '**/bootstrap/md/**',
    '**/bootstrap/json/**',
  ],
});
