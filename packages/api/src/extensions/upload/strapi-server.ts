/**
 * Upload plugin extension
 * Adds custom controller for folder listing (exposed via separate custom API)
 *
 * Note: In Strapi 5, the upload plugin uses factory-based routes which are harder
 * to extend. Instead of modifying plugin routes, we expose folder listing via
 * a separate custom API endpoint at /api/media-folders
 */

export default (plugin: any) => {
  // No modifications needed - folder listing is handled by custom API
  return plugin
}
