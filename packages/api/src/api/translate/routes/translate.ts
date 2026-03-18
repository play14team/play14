export default {
  routes: [
    {
      method: "POST",
      path: "/translate",
      handler: "translate.translate",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
}
