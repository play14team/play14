export default {
  routes: [
    {
      method: 'GET',
      path: '/events/:slug',
      handler: 'event.findOne',
    }
  ]
}
