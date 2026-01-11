/**
 * CSV import routes for organizers
 */

export default {
  routes: [
    {
      method: "POST",
      path: "/imports/audience-attendees",
      handler: "import.uploadAudienceAttendees",
      info: { apiName: "import", type: "content-api" },
      config: {
        policies: [],
        middlewares: [],
        description: "Upload attendee/audience CSVs and import users/players (organizers only)",
      },
    },
  ],
}
