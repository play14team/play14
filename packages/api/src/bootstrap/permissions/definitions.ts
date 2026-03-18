/**
 * Permission definitions mapping each action to its minimum required role
 *
 * Each role inherits all permissions from roles below it in the hierarchy:
 * public < player < host < mentor < founder
 *
 * When adding a new endpoint:
 * 1. Add the action constant to actions.ts
 * 2. Add the permission definition here with the minimum role required
 * 3. Restart Strapi - permissions sync automatically
 */

import {
  ARTICLE_ACTIONS,
  ATTENDANCE_CLAIM_ACTIONS,
  AUTH_ACTIONS,
  BUDGET_LINE_ITEM_ACTIONS,
  CONTENT_TYPE_BUILDER_ACTIONS,
  DISCOUNT_CODE_ACTIONS,
  EMAIL_ACTIONS,
  EVENT_ACTIONS,
  EVENT_LOCATION_ACTIONS,
  EXPECTATION_ACTIONS,
  FUZZY_SEARCH_ACTIONS,
  GAME_ACTIONS,
  HISTORY_ACTIONS,
  HOME_ACTIONS,
  I18N_ACTIONS,
  IMPORT_ACTIONS,
  LIKED_ITEM_ACTIONS,
  LINKEDIN_POST_ACTIONS,
  MEDIA_FILE_ACTIONS,
  MEDIA_FOLDER_ACTIONS,
  NEWSLETTER_ACTIONS,
  NEWSLETTER_SEND_ACTIONS,
  PERMISSIONS_ACTIONS,
  PLAYER_ACTIONS,
  PLAYER_CLAIM_ACTIONS,
  RESULT_LINE_ITEM_ACTIONS,
  ROLE_ACTIONS,
  SPONSOR_ACTIONS,
  STRIPE_ACCOUNT_ACTIONS,
  TAG_ACTIONS,
  TESTIMONIAL_ACTIONS,
  TICKET_ACTIONS,
  TICKET_ORDER_ACTIONS,
  TICKET_TYPE_ACTIONS,
  TRANSLATE_ACTIONS,
  UPLOAD_ACTIONS,
  USER_ACTIONS,
  VENUE_ACTIONS,
} from "./actions"
import { type PermissionDefinition, ROLE_TYPES } from "./types"

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // ==================== PUBLIC ROLE ====================
  // These are accessible to everyone, including unauthenticated users

  // Authentication (public)
  { action: AUTH_ACTIONS.CALLBACK, minimumRole: ROLE_TYPES.PUBLIC },
  { action: AUTH_ACTIONS.CONNECT, minimumRole: ROLE_TYPES.PUBLIC },
  { action: AUTH_ACTIONS.REGISTER, minimumRole: ROLE_TYPES.PUBLIC },
  { action: AUTH_ACTIONS.FORGOT_PASSWORD, minimumRole: ROLE_TYPES.PUBLIC },
  { action: AUTH_ACTIONS.RESET_PASSWORD, minimumRole: ROLE_TYPES.PUBLIC },

  // Content (public)
  { action: EXPECTATION_ACTIONS.FIND, minimumRole: ROLE_TYPES.PUBLIC },
  { action: HISTORY_ACTIONS.FIND, minimumRole: ROLE_TYPES.PUBLIC },

  // Liked items showcase (public - for public showcase page)
  { action: LIKED_ITEM_ACTIONS.LIST_PUBLIC, minimumRole: ROLE_TYPES.PUBLIC },

  // Newsletter subscription (public)
  { action: NEWSLETTER_ACTIONS.SUBSCRIBE, minimumRole: ROLE_TYPES.PUBLIC },

  // LinkedIn post management (Host+ can preview/post)
  { action: LINKEDIN_POST_ACTIONS.PREVIEW, minimumRole: ROLE_TYPES.HOST },
  { action: LINKEDIN_POST_ACTIONS.POST_MANUALLY, minimumRole: ROLE_TYPES.HOST },

  // User me (needed for auth flow)
  { action: USER_ACTIONS.ME, minimumRole: ROLE_TYPES.PUBLIC },

  // ==================== PLAYER ROLE (BASE ACCESS) ====================
  // Default role for logged-in users (player link may not exist yet)

  // Events (read)
  { action: EVENT_ACTIONS.FIND, minimumRole: ROLE_TYPES.PLAYER },
  { action: EVENT_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.PLAYER },

  // Player profile management
  { action: PLAYER_ACTIONS.FIND_ME, minimumRole: ROLE_TYPES.PLAYER },
  { action: PLAYER_ACTIONS.UPDATE_ME, minimumRole: ROLE_TYPES.PLAYER },
  { action: PLAYER_ACTIONS.CREATE_FOR_USER, minimumRole: ROLE_TYPES.PLAYER },
  { action: PLAYER_ACTIONS.AUTO_LINK, minimumRole: ROLE_TYPES.PLAYER },

  // Player claim process (for users without a player yet)
  { action: PLAYER_CLAIM_ACTIONS.CHECK_MATCH, minimumRole: ROLE_TYPES.PLAYER },
  { action: PLAYER_CLAIM_ACTIONS.GET_SUGGESTIONS, minimumRole: ROLE_TYPES.PLAYER },
  { action: PLAYER_CLAIM_ACTIONS.SUBMIT_CLAIM, minimumRole: ROLE_TYPES.PLAYER },
  { action: PLAYER_CLAIM_ACTIONS.CANCEL_CLAIM, minimumRole: ROLE_TYPES.PLAYER },
  { action: PLAYER_CLAIM_ACTIONS.FIND_MY_CLAIMS, minimumRole: ROLE_TYPES.PLAYER },

  // Attended events (viewing own attendance history)
  { action: PLAYER_ACTIONS.GET_MY_ATTENDED_EVENTS, minimumRole: ROLE_TYPES.PLAYER },

  // Attendance claims (basic)
  { action: ATTENDANCE_CLAIM_ACTIONS.SEARCH_EVENTS, minimumRole: ROLE_TYPES.PLAYER },
  { action: ATTENDANCE_CLAIM_ACTIONS.GET_OVER_EVENTS, minimumRole: ROLE_TYPES.PLAYER },
  { action: ATTENDANCE_CLAIM_ACTIONS.GET_MY_CLAIMS, minimumRole: ROLE_TYPES.PLAYER },
  { action: ATTENDANCE_CLAIM_ACTIONS.GET_PENDING_FOR_PLAYER, minimumRole: ROLE_TYPES.PLAYER },
  { action: ATTENDANCE_CLAIM_ACTIONS.SUBMIT_CLAIM, minimumRole: ROLE_TYPES.PLAYER },
  { action: ATTENDANCE_CLAIM_ACTIONS.CANCEL_CLAIM, minimumRole: ROLE_TYPES.PLAYER },

  // ==================== PLAYER ROLE (LINKED PROFILE) ====================
  // These require a linked player profile

  // Profile pictures
  { action: PLAYER_ACTIONS.UPLOAD_PICTURE, minimumRole: ROLE_TYPES.PLAYER },
  { action: PLAYER_ACTIONS.DELETE_PICTURE, minimumRole: ROLE_TYPES.PLAYER },

  // Player claims - players can approve/reject claims on their own profile
  { action: PLAYER_CLAIM_ACTIONS.GET_PENDING_CLAIMS, minimumRole: ROLE_TYPES.PLAYER },
  { action: PLAYER_CLAIM_ACTIONS.APPROVE_CLAIM, minimumRole: ROLE_TYPES.PLAYER },
  { action: PLAYER_CLAIM_ACTIONS.REJECT_CLAIM, minimumRole: ROLE_TYPES.PLAYER },

  // Ticket management
  { action: TICKET_ACTIONS.GET_MY_TICKETS, minimumRole: ROLE_TYPES.PLAYER },

  // Ticket ordering
  { action: TICKET_ORDER_ACTIONS.GET_MY_ORDERS, minimumRole: ROLE_TYPES.PLAYER },
  { action: TICKET_ORDER_ACTIONS.INITIATE_ORDER, minimumRole: ROLE_TYPES.PLAYER },
  { action: TICKET_ORDER_ACTIONS.REQUEST_REFUND, minimumRole: ROLE_TYPES.PLAYER },
  { action: TICKET_ORDER_ACTIONS.DOWNLOAD_INVOICE, minimumRole: ROLE_TYPES.PLAYER },

  // Draft order flow (multi-step checkout with attendee info)
  { action: TICKET_ORDER_ACTIONS.CREATE_DRAFT_ORDER, minimumRole: ROLE_TYPES.PLAYER },
  { action: TICKET_ORDER_ACTIONS.UPDATE_ATTENDEE_INFO, minimumRole: ROLE_TYPES.PLAYER },
  { action: TICKET_ORDER_ACTIONS.FINALIZE_CHECKOUT, minimumRole: ROLE_TYPES.PLAYER },

  // ==================== HOST ROLE ====================
  // These require organizer (Host/Mentor/Founder) status

  // Event management
  { action: EVENT_ACTIONS.GET_MY_EVENTS, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.GET_LOCATIONS, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.GET_VENUES, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.GET_ORGANIZERS, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.CREATE_EVENT, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.GET_EVENT_FOR_EDIT, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.UPDATE_EVENT, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.PREVIEW_EVENT, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.PUBLISH_EVENT, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.UNPUBLISH_EVENT, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.UPDATE_FINANCE, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.UPDATE_MEDIA_LINKS, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.UPDATE_SCHEDULE, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.UPLOAD_IMAGE, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.SET_IMAGE_FROM_LIBRARY, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.REMOVE_IMAGE, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.UPDATE_SPONSORSHIPS, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.GET_REVENUE_ANALYTICS, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.GET_PARTICIPANTS, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.GET_PARTICIPANT_STATS, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.CHECK_IN_PARTICIPANT, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.UNDO_CHECK_IN, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.GET_TRANSLATION, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_ACTIONS.UPDATE_TRANSLATION, minimumRole: ROLE_TYPES.HOST },

  // Player management (for event organizers)
  { action: PLAYER_ACTIONS.LIST_PLAYERS, minimumRole: ROLE_TYPES.HOST },
  { action: PLAYER_ACTIONS.GET_PLAYER_FOR_EDIT, minimumRole: ROLE_TYPES.HOST },
  { action: PLAYER_ACTIONS.UPDATE_PLAYER, minimumRole: ROLE_TYPES.HOST },
  { action: PLAYER_ACTIONS.UPDATE_PLAYER_POSITION, minimumRole: ROLE_TYPES.HOST },

  // Player avatar management (organizers can manage avatars)
  { action: PLAYER_ACTIONS.SET_AVATAR_FROM_LIBRARY, minimumRole: ROLE_TYPES.HOST },
  { action: PLAYER_ACTIONS.REMOVE_AVATAR, minimumRole: ROLE_TYPES.HOST },
  { action: PLAYER_ACTIONS.UPLOAD_AVATAR_FOR_PLAYER, minimumRole: ROLE_TYPES.HOST },

  // Single invite (organizers can send invites to players)
  { action: PLAYER_ACTIONS.SEND_SINGLE_INVITE, minimumRole: ROLE_TYPES.HOST },
  { action: PLAYER_ACTIONS.GET_PLAYER_SETTINGS, minimumRole: ROLE_TYPES.HOST },
  { action: PLAYER_ACTIONS.UPDATE_PLAYER_SETTINGS, minimumRole: ROLE_TYPES.HOST },
  { action: PLAYER_ACTIONS.SEND_PASSWORD_RESET, minimumRole: ROLE_TYPES.HOST },

  // Attendance claim management (for own events)
  { action: ATTENDANCE_CLAIM_ACTIONS.GET_PENDING_FOR_MY_EVENTS, minimumRole: ROLE_TYPES.HOST },
  { action: ATTENDANCE_CLAIM_ACTIONS.APPROVE_CLAIM, minimumRole: ROLE_TYPES.HOST },
  { action: ATTENDANCE_CLAIM_ACTIONS.REJECT_CLAIM, minimumRole: ROLE_TYPES.HOST },

  // Stripe account management
  { action: STRIPE_ACCOUNT_ACTIONS.CREATE_ACCOUNT, minimumRole: ROLE_TYPES.HOST },
  { action: STRIPE_ACCOUNT_ACTIONS.GET_ACCOUNT_STATUS, minimumRole: ROLE_TYPES.HOST },
  { action: STRIPE_ACCOUNT_ACTIONS.GET_ONBOARDING_LINK, minimumRole: ROLE_TYPES.HOST },
  { action: STRIPE_ACCOUNT_ACTIONS.GET_DASHBOARD_LINK, minimumRole: ROLE_TYPES.HOST },
  { action: STRIPE_ACCOUNT_ACTIONS.GET_EVENT_HOST_ACCOUNTS, minimumRole: ROLE_TYPES.HOST },
  { action: STRIPE_ACCOUNT_ACTIONS.LINK_ACCOUNT_TO_EVENT, minimumRole: ROLE_TYPES.HOST },
  { action: STRIPE_ACCOUNT_ACTIONS.UNLINK_ACCOUNT_FROM_EVENT, minimumRole: ROLE_TYPES.HOST },

  // Ticket type management
  { action: TICKET_TYPE_ACTIONS.CREATE_TICKET_TYPE, minimumRole: ROLE_TYPES.HOST },
  { action: TICKET_TYPE_ACTIONS.UPDATE_TICKET_TYPE, minimumRole: ROLE_TYPES.HOST },
  { action: TICKET_TYPE_ACTIONS.DELETE_TICKET_TYPE, minimumRole: ROLE_TYPES.HOST },
  { action: TICKET_TYPE_ACTIONS.GET_EVENT_ORDERS, minimumRole: ROLE_TYPES.HOST },

  // Discount code management
  { action: DISCOUNT_CODE_ACTIONS.CREATE, minimumRole: ROLE_TYPES.HOST },
  { action: DISCOUNT_CODE_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.HOST },
  { action: DISCOUNT_CODE_ACTIONS.DELETE, minimumRole: ROLE_TYPES.HOST },
  { action: DISCOUNT_CODE_ACTIONS.LIST, minimumRole: ROLE_TYPES.HOST },
  { action: DISCOUNT_CODE_ACTIONS.VALIDATE, minimumRole: ROLE_TYPES.PUBLIC },

  // CSV imports (organizers)
  { action: IMPORT_ACTIONS.UPLOAD_AUDIENCE_ATTENDEES, minimumRole: ROLE_TYPES.HOST },

  // Event location management (admin panel)
  { action: EVENT_LOCATION_ACTIONS.LIST, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_LOCATION_ACTIONS.FIND_ONE_ADMIN, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_LOCATION_ACTIONS.CREATE_ADMIN, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_LOCATION_ACTIONS.UPDATE_ADMIN, minimumRole: ROLE_TYPES.HOST },
  { action: EVENT_LOCATION_ACTIONS.DELETE_ADMIN, minimumRole: ROLE_TYPES.HOST },

  // Venue management (admin panel)
  { action: VENUE_ACTIONS.LIST, minimumRole: ROLE_TYPES.HOST },
  { action: VENUE_ACTIONS.FIND_ONE_ADMIN, minimumRole: ROLE_TYPES.HOST },
  { action: VENUE_ACTIONS.CREATE_ADMIN, minimumRole: ROLE_TYPES.HOST },
  { action: VENUE_ACTIONS.UPDATE_ADMIN, minimumRole: ROLE_TYPES.HOST },
  { action: VENUE_ACTIONS.DELETE_ADMIN, minimumRole: ROLE_TYPES.HOST },
  { action: VENUE_ACTIONS.UPLOAD_LOGO, minimumRole: ROLE_TYPES.HOST },
  { action: VENUE_ACTIONS.SET_LOGO_FROM_LIBRARY, minimumRole: ROLE_TYPES.HOST },
  { action: VENUE_ACTIONS.REMOVE_LOGO, minimumRole: ROLE_TYPES.HOST },

  // Sponsor management (admin panel)
  { action: SPONSOR_ACTIONS.LIST, minimumRole: ROLE_TYPES.HOST },
  { action: SPONSOR_ACTIONS.FIND_ONE_ADMIN, minimumRole: ROLE_TYPES.HOST },
  { action: SPONSOR_ACTIONS.CREATE_ADMIN, minimumRole: ROLE_TYPES.HOST },
  { action: SPONSOR_ACTIONS.UPDATE_ADMIN, minimumRole: ROLE_TYPES.HOST },
  { action: SPONSOR_ACTIONS.DELETE_ADMIN, minimumRole: ROLE_TYPES.HOST },
  { action: SPONSOR_ACTIONS.UPLOAD_LOGO, minimumRole: ROLE_TYPES.HOST },
  { action: SPONSOR_ACTIONS.SET_LOGO_FROM_LIBRARY, minimumRole: ROLE_TYPES.HOST },
  { action: SPONSOR_ACTIONS.REMOVE_LOGO, minimumRole: ROLE_TYPES.HOST },

  // Budget line items management
  { action: BUDGET_LINE_ITEM_ACTIONS.LIST, minimumRole: ROLE_TYPES.HOST },
  { action: BUDGET_LINE_ITEM_ACTIONS.CREATE, minimumRole: ROLE_TYPES.HOST },
  { action: BUDGET_LINE_ITEM_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.HOST },
  { action: BUDGET_LINE_ITEM_ACTIONS.DELETE, minimumRole: ROLE_TYPES.HOST },
  { action: BUDGET_LINE_ITEM_ACTIONS.BULK_UPDATE, minimumRole: ROLE_TYPES.HOST },

  // Result line items management
  { action: RESULT_LINE_ITEM_ACTIONS.LIST, minimumRole: ROLE_TYPES.HOST },
  { action: RESULT_LINE_ITEM_ACTIONS.CREATE, minimumRole: ROLE_TYPES.HOST },
  { action: RESULT_LINE_ITEM_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.HOST },
  { action: RESULT_LINE_ITEM_ACTIONS.DELETE, minimumRole: ROLE_TYPES.HOST },
  { action: RESULT_LINE_ITEM_ACTIONS.BULK_UPDATE, minimumRole: ROLE_TYPES.HOST },

  // ==================== FOUNDER ROLE ====================
  // Full administrative access - these are founder-only

  // Full user/role management
  { action: USER_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: USER_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: USER_ACTIONS.COUNT, minimumRole: ROLE_TYPES.FOUNDER },
  { action: USER_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: USER_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: USER_ACTIONS.DESTROY, minimumRole: ROLE_TYPES.FOUNDER },

  { action: ROLE_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: ROLE_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: ROLE_ACTIONS.CREATE_ROLE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: ROLE_ACTIONS.UPDATE_ROLE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: ROLE_ACTIONS.DELETE_ROLE, minimumRole: ROLE_TYPES.FOUNDER },

  { action: PERMISSIONS_ACTIONS.GET_PERMISSIONS, minimumRole: ROLE_TYPES.FOUNDER },

  // Event full CRUD
  { action: EVENT_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: EVENT_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: EVENT_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Player full CRUD
  { action: PLAYER_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: PLAYER_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: PLAYER_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: PLAYER_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: PLAYER_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Player claim full CRUD
  { action: PLAYER_CLAIM_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: PLAYER_CLAIM_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: PLAYER_CLAIM_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: PLAYER_CLAIM_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: PLAYER_CLAIM_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Articles full CRUD
  { action: ARTICLE_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: ARTICLE_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: ARTICLE_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: ARTICLE_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: ARTICLE_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Expectations full CRUD
  { action: EXPECTATION_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: EXPECTATION_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: EXPECTATION_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: EXPECTATION_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Event locations full CRUD
  { action: EVENT_LOCATION_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: EVENT_LOCATION_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: EVENT_LOCATION_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: EVENT_LOCATION_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: EVENT_LOCATION_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Games full CRUD
  { action: GAME_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: GAME_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: GAME_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: GAME_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: GAME_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // History management (FIND is public, see above)
  { action: HISTORY_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: HISTORY_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Home management
  { action: HOME_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: HOME_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: HOME_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Sponsors full CRUD
  { action: SPONSOR_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: SPONSOR_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: SPONSOR_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: SPONSOR_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: SPONSOR_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Tags full CRUD
  { action: TAG_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: TAG_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: TAG_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: TAG_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: TAG_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Testimonials full CRUD
  { action: TESTIMONIAL_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: TESTIMONIAL_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: TESTIMONIAL_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: TESTIMONIAL_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: TESTIMONIAL_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Venues full CRUD
  { action: VENUE_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: VENUE_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: VENUE_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: VENUE_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: VENUE_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Liked items full CRUD (founders only)
  { action: LIKED_ITEM_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: LIKED_ITEM_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: LIKED_ITEM_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: LIKED_ITEM_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: LIKED_ITEM_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Liked items admin management (founders only)
  { action: LIKED_ITEM_ACTIONS.LIST, minimumRole: ROLE_TYPES.FOUNDER },
  { action: LIKED_ITEM_ACTIONS.FIND_ONE_ADMIN, minimumRole: ROLE_TYPES.FOUNDER },
  { action: LIKED_ITEM_ACTIONS.CREATE_ADMIN, minimumRole: ROLE_TYPES.FOUNDER },
  { action: LIKED_ITEM_ACTIONS.UPDATE_ADMIN, minimumRole: ROLE_TYPES.FOUNDER },
  { action: LIKED_ITEM_ACTIONS.DELETE_ADMIN, minimumRole: ROLE_TYPES.FOUNDER },
  { action: LIKED_ITEM_ACTIONS.UPLOAD_IMAGE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: LIKED_ITEM_ACTIONS.SET_IMAGE_FROM_LIBRARY, minimumRole: ROLE_TYPES.FOUNDER },
  { action: LIKED_ITEM_ACTIONS.REMOVE_IMAGE, minimumRole: ROLE_TYPES.FOUNDER },

  // File uploads
  { action: UPLOAD_ACTIONS.FIND, minimumRole: ROLE_TYPES.HOST },
  { action: UPLOAD_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.HOST },
  { action: UPLOAD_ACTIONS.UPLOAD, minimumRole: ROLE_TYPES.HOST },
  { action: UPLOAD_ACTIONS.DESTROY, minimumRole: ROLE_TYPES.FOUNDER },

  // Media library browsing (for event image management)
  { action: MEDIA_FOLDER_ACTIONS.FIND, minimumRole: ROLE_TYPES.HOST },
  { action: MEDIA_FILE_ACTIONS.FIND, minimumRole: ROLE_TYPES.HOST },

  // Plugins
  { action: I18N_ACTIONS.LIST_LOCALES, minimumRole: ROLE_TYPES.FOUNDER },
  { action: EMAIL_ACTIONS.SEND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: FUZZY_SEARCH_ACTIONS.SEARCH, minimumRole: ROLE_TYPES.FOUNDER },
  { action: CONTENT_TYPE_BUILDER_ACTIONS.GET_COMPONENT, minimumRole: ROLE_TYPES.FOUNDER },
  { action: CONTENT_TYPE_BUILDER_ACTIONS.GET_COMPONENTS, minimumRole: ROLE_TYPES.FOUNDER },
  { action: CONTENT_TYPE_BUILDER_ACTIONS.GET_CONTENT_TYPE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: CONTENT_TYPE_BUILDER_ACTIONS.GET_CONTENT_TYPES, minimumRole: ROLE_TYPES.FOUNDER },

  // Stripe webhook (public - needed for Stripe callbacks, uses signature verification)
  { action: TICKET_ORDER_ACTIONS.HANDLE_STRIPE_WEBHOOK, minimumRole: ROLE_TYPES.PUBLIC },

  // Available tickets (public for event pages to show ticket availability)
  { action: TICKET_ORDER_ACTIONS.GET_AVAILABLE_TICKETS, minimumRole: ROLE_TYPES.PUBLIC },

  // Ticket details (public - needed for QR code scanning and ticket sharing)
  { action: TICKET_ACTIONS.GET_TICKET_DETAILS, minimumRole: ROLE_TYPES.PUBLIC },

  // Order status (public with limited info for unauthenticated, full info for owners/organizers)
  { action: TICKET_ORDER_ACTIONS.GET_ORDER_STATUS, minimumRole: ROLE_TYPES.PUBLIC },

  // Cancel pending order (player - users can cancel their own pending orders)
  { action: TICKET_ORDER_ACTIONS.CANCEL_ORDER, minimumRole: ROLE_TYPES.PLAYER },

  // ==================== NEWSLETTER SEND (FOUNDER ONLY) ====================
  // Newsletter management for community broadcasts
  { action: NEWSLETTER_SEND_ACTIONS.LIST, minimumRole: ROLE_TYPES.FOUNDER },
  { action: NEWSLETTER_SEND_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: NEWSLETTER_SEND_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: NEWSLETTER_SEND_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: NEWSLETTER_SEND_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: NEWSLETTER_SEND_ACTIONS.RETRY, minimumRole: ROLE_TYPES.FOUNDER },
  { action: NEWSLETTER_SEND_ACTIONS.AUDIENCE_COUNT, minimumRole: ROLE_TYPES.FOUNDER },
  { action: NEWSLETTER_SEND_ACTIONS.SEND_TEST, minimumRole: ROLE_TYPES.FOUNDER },
  { action: NEWSLETTER_SEND_ACTIONS.SEND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: NEWSLETTER_SEND_ACTIONS.PREVIEW, minimumRole: ROLE_TYPES.FOUNDER },
  { action: NEWSLETTER_SEND_ACTIONS.AI_GENERATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: NEWSLETTER_SEND_ACTIONS.AI_IMPROVE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: NEWSLETTER_SEND_ACTIONS.AI_SUGGEST_SUBJECTS, minimumRole: ROLE_TYPES.FOUNDER },

  // ==================== TRANSLATION ====================
  // AI-powered translation for content (Host+)
  { action: TRANSLATE_ACTIONS.TRANSLATE, minimumRole: ROLE_TYPES.HOST },
]
