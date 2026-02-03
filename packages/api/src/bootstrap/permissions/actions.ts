/**
 * Action constants for all permission-controlled endpoints
 *
 * Actions are grouped by domain for clarity and maintainability.
 * When adding a new endpoint, add its action constant here.
 */

// ==================== AUTHENTICATION ====================
export const AUTH_ACTIONS = {
  CALLBACK: "plugin::users-permissions.auth.callback",
  CONNECT: "plugin::users-permissions.auth.connect",
  REGISTER: "plugin::users-permissions.auth.register",
  CHANGE_PASSWORD: "plugin::users-permissions.auth.changePassword",
  FORGOT_PASSWORD: "plugin::users-permissions.auth.forgotPassword",
  RESET_PASSWORD: "plugin::users-permissions.auth.resetPassword",
  EMAIL_CONFIRMATION: "plugin::users-permissions.auth.emailConfirmation",
  SEND_EMAIL_CONFIRMATION: "plugin::users-permissions.auth.sendEmailConfirmation",
  LOGOUT: "plugin::users-permissions.auth.logout",
  REFRESH: "plugin::users-permissions.auth.refresh",
} as const

export const USER_ACTIONS = {
  ME: "plugin::users-permissions.user.me",
  FIND: "plugin::users-permissions.user.find",
  FIND_ONE: "plugin::users-permissions.user.findOne",
  COUNT: "plugin::users-permissions.user.count",
  CREATE: "plugin::users-permissions.user.create",
  UPDATE: "plugin::users-permissions.user.update",
  DESTROY: "plugin::users-permissions.user.destroy",
} as const

export const ROLE_ACTIONS = {
  FIND: "plugin::users-permissions.role.find",
  FIND_ONE: "plugin::users-permissions.role.findOne",
  CREATE_ROLE: "plugin::users-permissions.role.createRole",
  UPDATE_ROLE: "plugin::users-permissions.role.updateRole",
  DELETE_ROLE: "plugin::users-permissions.role.deleteRole",
} as const

export const PERMISSIONS_ACTIONS = {
  GET_PERMISSIONS: "plugin::users-permissions.permissions.getPermissions",
} as const

// ==================== EVENTS ====================
export const EVENT_ACTIONS = {
  // Standard CRUD
  FIND: "api::event.event.find",
  FIND_ONE: "api::event.event.findOne",
  CREATE: "api::event.event.create",
  UPDATE: "api::event.event.update",
  DELETE: "api::event.event.delete",

  // Custom actions for organizers
  GET_MY_EVENTS: "api::event.custom-event.getMyEvents",
  GET_LOCATIONS: "api::event.custom-event.getLocations",
  GET_VENUES: "api::event.custom-event.getVenues",
  GET_ORGANIZERS: "api::event.custom-event.getOrganizers",
  CREATE_EVENT: "api::event.custom-event.createEvent",
  GET_EVENT_FOR_EDIT: "api::event.custom-event.getEventForEdit",
  UPDATE_EVENT: "api::event.custom-event.updateEvent",
  PREVIEW_EVENT: "api::event.custom-event.previewEvent",
  PUBLISH_EVENT: "api::event.custom-event.publishEvent",
  UNPUBLISH_EVENT: "api::event.custom-event.unpublishEvent",
  UPDATE_FINANCE: "api::event.custom-event.updateFinance",
  UPDATE_MEDIA_LINKS: "api::event.custom-event.updateMediaLinks",
  UPDATE_SCHEDULE: "api::event.custom-event.updateSchedule",
  UPLOAD_IMAGE: "api::event.custom-event.uploadImage",
  SET_IMAGE_FROM_LIBRARY: "api::event.custom-event.setImageFromLibrary",
  REMOVE_IMAGE: "api::event.custom-event.removeImage",
  UPDATE_SPONSORSHIPS: "api::event.custom-event.updateSponsorships",
  GET_REVENUE_ANALYTICS: "api::event.custom-event.getRevenueAnalytics",
  GET_PARTICIPANTS: "api::event.custom-event.getParticipants",
  GET_PARTICIPANT_STATS: "api::event.custom-event.getParticipantStats",
  CHECK_IN_PARTICIPANT: "api::event.custom-event.checkInParticipant",
  UNDO_CHECK_IN: "api::event.custom-event.undoCheckIn",
} as const

// ==================== PLAYERS ====================
export const PLAYER_ACTIONS = {
  // Standard CRUD
  FIND: "api::player.player.find",
  FIND_ONE: "api::player.player.findOne",
  CREATE: "api::player.player.create",
  UPDATE: "api::player.player.update",
  DELETE: "api::player.player.delete",

  // Custom actions
  FIND_ME: "api::player.custom-player.findMe",
  UPDATE_ME: "api::player.custom-player.updateMe",
  CREATE_FOR_USER: "api::player.custom-player.createForUser",
  AUTO_LINK: "api::player.custom-player.autoLink",
  UPLOAD_PICTURE: "api::player.custom-player.uploadPicture",
  DELETE_PICTURE: "api::player.custom-player.deletePicture",
  LIST_PLAYERS: "api::player.custom-player.listPlayers",
  GET_PLAYER_FOR_EDIT: "api::player.custom-player.getPlayerForEdit",
  UPDATE_PLAYER: "api::player.custom-player.updatePlayer",
  UPDATE_PLAYER_POSITION: "api::player.custom-player.updatePlayerPosition",
  GET_MY_ATTENDED_EVENTS: "api::player.custom-player.getMyAttendedEvents",

  // Avatar management (organizers can use these on any player including themselves)
  SET_AVATAR_FROM_LIBRARY: "api::player.custom-player.setAvatarFromLibrary",
  REMOVE_AVATAR: "api::player.custom-player.removeAvatar",
  UPLOAD_AVATAR_FOR_PLAYER: "api::player.custom-player.uploadAvatarForPlayer",

  // Single invite (organizers can send invites to players)
  SEND_SINGLE_INVITE: "api::player.custom-player.sendSingleInvite",
} as const

// ==================== PLAYER CLAIMS ====================
export const PLAYER_CLAIM_ACTIONS = {
  // Standard CRUD
  FIND: "api::player-claim.player-claim.find",
  FIND_ONE: "api::player-claim.player-claim.findOne",
  CREATE: "api::player-claim.player-claim.create",
  UPDATE: "api::player-claim.player-claim.update",
  DELETE: "api::player-claim.player-claim.delete",

  // Custom actions
  CHECK_MATCH: "api::player-claim.custom-player-claim.checkMatch",
  GET_SUGGESTIONS: "api::player-claim.custom-player-claim.getSuggestions",
  SUBMIT_CLAIM: "api::player-claim.custom-player-claim.submitClaim",
  CANCEL_CLAIM: "api::player-claim.custom-player-claim.cancelClaim",
  FIND_MY_CLAIMS: "api::player-claim.custom-player-claim.findMyClaims",
  GET_PENDING_CLAIMS: "api::player-claim.custom-player-claim.getPendingClaims",
  APPROVE_CLAIM: "api::player-claim.custom-player-claim.approveClaim",
  REJECT_CLAIM: "api::player-claim.custom-player-claim.rejectClaim",
} as const

// ==================== ATTENDANCE CLAIMS ====================
export const ATTENDANCE_CLAIM_ACTIONS = {
  SEARCH_EVENTS: "api::attendance-claim.custom-attendance-claim.searchEvents",
  GET_OVER_EVENTS: "api::attendance-claim.custom-attendance-claim.getOverEvents",
  GET_MY_CLAIMS: "api::attendance-claim.custom-attendance-claim.getMyClaims",
  GET_PENDING_FOR_PLAYER: "api::attendance-claim.custom-attendance-claim.getPendingClaimsForPlayer",
  GET_PENDING_FOR_MY_EVENTS:
    "api::attendance-claim.custom-attendance-claim.getPendingClaimsForMyEvents",
  SUBMIT_CLAIM: "api::attendance-claim.custom-attendance-claim.submitClaim",
  CANCEL_CLAIM: "api::attendance-claim.custom-attendance-claim.cancelClaim",
  APPROVE_CLAIM: "api::attendance-claim.custom-attendance-claim.approveClaim",
  REJECT_CLAIM: "api::attendance-claim.custom-attendance-claim.rejectClaim",
} as const

// ==================== STRIPE ACCOUNTS ====================
export const STRIPE_ACCOUNT_ACTIONS = {
  CREATE_ACCOUNT: "api::stripe-account.custom-stripe-account.createAccount",
  GET_ACCOUNT_STATUS: "api::stripe-account.custom-stripe-account.getAccountStatus",
  GET_ONBOARDING_LINK: "api::stripe-account.custom-stripe-account.getOnboardingLink",
  GET_DASHBOARD_LINK: "api::stripe-account.custom-stripe-account.getDashboardLink",
  GET_EVENT_HOST_ACCOUNTS: "api::stripe-account.custom-stripe-account.getEventHostAccounts",
  LINK_ACCOUNT_TO_EVENT: "api::stripe-account.custom-stripe-account.linkAccountToEvent",
  UNLINK_ACCOUNT_FROM_EVENT: "api::stripe-account.custom-stripe-account.unlinkAccountFromEvent",
} as const

// ==================== TICKET ORDERS ====================
export const TICKET_ORDER_ACTIONS = {
  GET_AVAILABLE_TICKETS: "api::ticket-order.custom-ticket-order.getAvailableTickets",
  GET_MY_ORDERS: "api::ticket-order.custom-ticket-order.getMyOrders",
  GET_ORDER_STATUS: "api::ticket-order.custom-ticket-order.getOrderStatus",
  INITIATE_ORDER: "api::ticket-order.custom-ticket-order.initiateOrder",
  REQUEST_REFUND: "api::ticket-order.custom-ticket-order.requestRefund",
  CANCEL_ORDER: "api::ticket-order.custom-ticket-order.cancelOrder",
  DOWNLOAD_INVOICE: "api::ticket-order.custom-ticket-order.downloadInvoice",
  HANDLE_STRIPE_WEBHOOK: "api::ticket-order.webhook.handleStripeWebhook",
  // Draft order flow (multi-step checkout with attendee info)
  CREATE_DRAFT_ORDER: "api::ticket-order.custom-ticket-order.createDraftOrder",
  UPDATE_ATTENDEE_INFO: "api::ticket-order.custom-ticket-order.updateAttendeeInfo",
  FINALIZE_CHECKOUT: "api::ticket-order.custom-ticket-order.finalizeCheckout",
} as const

// ==================== TICKETS ====================
export const TICKET_ACTIONS = {
  GET_TICKET_DETAILS: "api::ticket.custom-ticket.getTicketDetails",
  GET_MY_TICKETS: "api::ticket.custom-ticket.getMyTickets",
} as const

// ==================== TICKET TYPES ====================
export const TICKET_TYPE_ACTIONS = {
  CREATE_TICKET_TYPE: "api::ticket-type.custom-ticket-type.createTicketType",
  UPDATE_TICKET_TYPE: "api::ticket-type.custom-ticket-type.updateTicketType",
  DELETE_TICKET_TYPE: "api::ticket-type.custom-ticket-type.deleteTicketType",
  GET_EVENT_ORDERS: "api::ticket-type.custom-ticket-type.getEventOrders",
} as const

// ==================== DISCOUNT CODES ====================
export const DISCOUNT_CODE_ACTIONS = {
  CREATE: "api::discount-code.custom-discount-code.createDiscountCode",
  UPDATE: "api::discount-code.custom-discount-code.updateDiscountCode",
  DELETE: "api::discount-code.custom-discount-code.deleteDiscountCode",
  LIST: "api::discount-code.custom-discount-code.getEventDiscountCodes",
  VALIDATE: "api::discount-code.custom-discount-code.validateDiscountCode",
} as const

// ==================== IMPORTS ====================
export const IMPORT_ACTIONS = {
  UPLOAD_AUDIENCE_ATTENDEES: "api::import.import.uploadAudienceAttendees",
} as const

// ==================== CONTENT TYPES (CRUD) ====================
export const ARTICLE_ACTIONS = {
  FIND: "api::article.article.find",
  FIND_ONE: "api::article.article.findOne",
  CREATE: "api::article.article.create",
  UPDATE: "api::article.article.update",
  DELETE: "api::article.article.delete",
} as const

export const EXPECTATION_ACTIONS = {
  FIND: "api::expectation.expectation.find",
  FIND_ONE: "api::expectation.expectation.findOne",
  CREATE: "api::expectation.expectation.create",
  UPDATE: "api::expectation.expectation.update",
  DELETE: "api::expectation.expectation.delete",
} as const

export const EVENT_LOCATION_ACTIONS = {
  // Standard CRUD
  FIND: "api::event-location.event-location.find",
  FIND_ONE: "api::event-location.event-location.findOne",
  CREATE: "api::event-location.event-location.create",
  UPDATE: "api::event-location.event-location.update",
  DELETE: "api::event-location.event-location.delete",

  // Custom actions for admin panel
  LIST: "api::event-location.custom-event-location.list",
  FIND_ONE_ADMIN: "api::event-location.custom-event-location.findOne",
  CREATE_ADMIN: "api::event-location.custom-event-location.create",
  UPDATE_ADMIN: "api::event-location.custom-event-location.update",
  DELETE_ADMIN: "api::event-location.custom-event-location.delete",
} as const

export const FORMAT_ACTIONS = {
  FIND: "api::format.format.find",
  UPDATE: "api::format.format.update",
  DELETE: "api::format.format.delete",
} as const

export const GAME_ACTIONS = {
  FIND: "api::game.game.find",
  FIND_ONE: "api::game.game.findOne",
  CREATE: "api::game.game.create",
  UPDATE: "api::game.game.update",
  DELETE: "api::game.game.delete",
} as const

export const HISTORY_ACTIONS = {
  FIND: "api::history.history.find",
  UPDATE: "api::history.history.update",
  DELETE: "api::history.history.delete",
} as const

export const HOME_ACTIONS = {
  FIND: "api::home.home.find",
  UPDATE: "api::home.home.update",
  DELETE: "api::home.home.delete",
} as const

export const SPONSOR_ACTIONS = {
  // Standard CRUD
  FIND: "api::sponsor.sponsor.find",
  FIND_ONE: "api::sponsor.sponsor.findOne",
  CREATE: "api::sponsor.sponsor.create",
  UPDATE: "api::sponsor.sponsor.update",
  DELETE: "api::sponsor.sponsor.delete",

  // Custom actions for admin panel
  LIST: "api::sponsor.custom-sponsor.list",
  FIND_ONE_ADMIN: "api::sponsor.custom-sponsor.findOne",
  CREATE_ADMIN: "api::sponsor.custom-sponsor.create",
  UPDATE_ADMIN: "api::sponsor.custom-sponsor.update",
  DELETE_ADMIN: "api::sponsor.custom-sponsor.delete",
  UPLOAD_LOGO: "api::sponsor.custom-sponsor.uploadLogo",
  SET_LOGO_FROM_LIBRARY: "api::sponsor.custom-sponsor.setLogoFromLibrary",
  REMOVE_LOGO: "api::sponsor.custom-sponsor.removeLogo",
} as const

export const TAG_ACTIONS = {
  FIND: "api::tag.tag.find",
  FIND_ONE: "api::tag.tag.findOne",
  CREATE: "api::tag.tag.create",
  UPDATE: "api::tag.tag.update",
  DELETE: "api::tag.tag.delete",
} as const

export const TESTIMONIAL_ACTIONS = {
  FIND: "api::testimonial.testimonial.find",
  FIND_ONE: "api::testimonial.testimonial.findOne",
  CREATE: "api::testimonial.testimonial.create",
  UPDATE: "api::testimonial.testimonial.update",
  DELETE: "api::testimonial.testimonial.delete",
} as const

export const LIKED_ITEM_ACTIONS = {
  // Standard CRUD
  FIND: "api::liked-item.liked-item.find",
  FIND_ONE: "api::liked-item.liked-item.findOne",
  CREATE: "api::liked-item.liked-item.create",
  UPDATE: "api::liked-item.liked-item.update",
  DELETE: "api::liked-item.liked-item.delete",

  // Custom actions for admin panel (founders only)
  LIST: "api::liked-item.custom-liked-item.list",
  FIND_ONE_ADMIN: "api::liked-item.custom-liked-item.findOne",
  CREATE_ADMIN: "api::liked-item.custom-liked-item.create",
  UPDATE_ADMIN: "api::liked-item.custom-liked-item.update",
  DELETE_ADMIN: "api::liked-item.custom-liked-item.delete",
  UPLOAD_IMAGE: "api::liked-item.custom-liked-item.uploadImage",
  SET_IMAGE_FROM_LIBRARY: "api::liked-item.custom-liked-item.setImageFromLibrary",
  REMOVE_IMAGE: "api::liked-item.custom-liked-item.removeImage",

  // Public showcase (no auth required)
  LIST_PUBLIC: "api::liked-item.custom-liked-item.listPublic",
} as const

export const VENUE_ACTIONS = {
  // Standard CRUD
  FIND: "api::venue.venue.find",
  FIND_ONE: "api::venue.venue.findOne",
  CREATE: "api::venue.venue.create",
  UPDATE: "api::venue.venue.update",
  DELETE: "api::venue.venue.delete",

  // Custom actions for admin panel
  LIST: "api::venue.custom-venue.list",
  FIND_ONE_ADMIN: "api::venue.custom-venue.findOne",
  CREATE_ADMIN: "api::venue.custom-venue.create",
  UPDATE_ADMIN: "api::venue.custom-venue.update",
  DELETE_ADMIN: "api::venue.custom-venue.delete",
  UPLOAD_LOGO: "api::venue.custom-venue.uploadLogo",
  SET_LOGO_FROM_LIBRARY: "api::venue.custom-venue.setLogoFromLibrary",
  REMOVE_LOGO: "api::venue.custom-venue.removeLogo",
} as const

// ==================== PLUGINS ====================
export const UPLOAD_ACTIONS = {
  FIND: "plugin::upload.content-api.find",
  FIND_ONE: "plugin::upload.content-api.findOne",
  UPLOAD: "plugin::upload.content-api.upload",
  DESTROY: "plugin::upload.content-api.destroy",
} as const

export const I18N_ACTIONS = {
  LIST_LOCALES: "plugin::i18n.locales.listLocales",
} as const

export const EMAIL_ACTIONS = {
  SEND: "plugin::email.email.send",
} as const

export const FUZZY_SEARCH_ACTIONS = {
  SEARCH: "plugin::fuzzy-search.searchController.search",
} as const

export const CONTENT_TYPE_BUILDER_ACTIONS = {
  GET_COMPONENT: "plugin::content-type-builder.components.getComponent",
  GET_COMPONENTS: "plugin::content-type-builder.components.getComponents",
  GET_CONTENT_TYPE: "plugin::content-type-builder.content-types.getContentType",
  GET_CONTENT_TYPES: "plugin::content-type-builder.content-types.getContentTypes",
} as const

// ==================== MEDIA LIBRARY ====================
export const MEDIA_FOLDER_ACTIONS = {
  FIND: "api::media-folder.media-folder.find",
} as const

export const MEDIA_FILE_ACTIONS = {
  FIND: "api::media-file.media-file.find",
} as const

// ==================== BUDGET LINE ITEMS ====================
export const BUDGET_LINE_ITEM_ACTIONS = {
  LIST: "api::budget-line-item.custom-budget-line-item.list",
  CREATE: "api::budget-line-item.custom-budget-line-item.create",
  UPDATE: "api::budget-line-item.custom-budget-line-item.update",
  DELETE: "api::budget-line-item.custom-budget-line-item.delete",
  BULK_UPDATE: "api::budget-line-item.custom-budget-line-item.bulkUpdate",
} as const

// ==================== RESULT LINE ITEMS ====================
export const RESULT_LINE_ITEM_ACTIONS = {
  LIST: "api::result-line-item.custom-result-line-item.list",
  CREATE: "api::result-line-item.custom-result-line-item.create",
  UPDATE: "api::result-line-item.custom-result-line-item.update",
  DELETE: "api::result-line-item.custom-result-line-item.delete",
  BULK_UPDATE: "api::result-line-item.custom-result-line-item.bulkUpdate",
} as const

// ==================== NEWSLETTER ====================
export const NEWSLETTER_ACTIONS = {
  SUBSCRIBE: "api::newsletter.newsletter.subscribe",
} as const

// ==================== LINKEDIN ====================
export const LINKEDIN_POST_ACTIONS = {
  PREVIEW: "api::linkedin-post.custom-linkedin-post.previewPost",
  POST_MANUALLY: "api::linkedin-post.custom-linkedin-post.postManually",
} as const

// ==================== NEWSLETTER SEND ====================
export const NEWSLETTER_SEND_ACTIONS = {
  // CRUD (founders only)
  LIST: "api::newsletter-send.custom-newsletter-send.list",
  FIND_ONE: "api::newsletter-send.custom-newsletter-send.findOne",
  CREATE: "api::newsletter-send.custom-newsletter-send.create",
  UPDATE: "api::newsletter-send.custom-newsletter-send.update",
  DELETE: "api::newsletter-send.custom-newsletter-send.delete",

  // Send operations (founders only)
  AUDIENCE_COUNT: "api::newsletter-send.custom-newsletter-send.audienceCount",
  SEND_TEST: "api::newsletter-send.custom-newsletter-send.sendTest",
  SEND: "api::newsletter-send.custom-newsletter-send.send",
  PREVIEW: "api::newsletter-send.custom-newsletter-send.preview",

  // AI operations (founders only)
  AI_GENERATE: "api::newsletter-send.custom-newsletter-send.aiGenerate",
  AI_IMPROVE: "api::newsletter-send.custom-newsletter-send.aiImprove",
  AI_SUGGEST_SUBJECTS: "api::newsletter-send.custom-newsletter-send.aiSuggestSubjects",
} as const
