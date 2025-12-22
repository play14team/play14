module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/events/:slug',
      handler: 'event.findOne',
    }
  ]
}
