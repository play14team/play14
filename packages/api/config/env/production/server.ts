export default ({ env }) => ({
  cron: {
    enabled: env.bool('CRON_ENABLED', false),
  },
});
