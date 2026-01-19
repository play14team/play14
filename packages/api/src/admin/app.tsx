/**
 * Strapi 5 Admin Panel Configuration
 * Migrated from Strapi 4 app.js
 */
export default {
  config: {
    locales: [
      // Add additional locales here if needed
      // 'fr', 'de', 'es', etc.
    ],
  },
  async bootstrap() {
    console.log("Admin panel bootstrapped")
  },
}
