module.exports = ({ env }) => ({
  connection: {
    pool: {
        min: 2,
        max: 30,
        idleTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        acquireTimeoutMillis: 60000,
        reapIntervalMillis: 1000,
        propagateCreateError: false,
        // Log pool statistics
        afterCreate: (conn, done) => {
          done(null, conn);
        },
        log: (message, logLevel) => {
          if (env.bool('DATABASE_POOL_DEBUG', false)) {
            console.log(`[DB Pool ${logLevel}] ${message}`);
          }
        },
    },
    connection: {
      ssl: {
        rejectUnauthorized: env.bool('DATABASE_SSL_SELF', false), // For self-signed certificates
      }
    },
    debug: env.bool('DATABASE_DEBUG', false),
    acquireConnectionTimeout: 60000,
  },
});
