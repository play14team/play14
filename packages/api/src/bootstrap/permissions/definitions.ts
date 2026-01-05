/**
 * Permission definitions mapping each action to its minimum required role
 *
 * Each role inherits all permissions from roles below it in the hierarchy:
 * public < authenticated < player < host < mentor < founder
 *
 * When adding a new endpoint:
 * 1. Add the action constant to actions.ts
 * 2. Add the permission definition here with the minimum role required
 * 3. Restart Strapi - permissions sync automatically
 */

import { ROLE_TYPES, type PermissionDefinition } from "./types"
import {
  AUTH_ACTIONS,
  USER_ACTIONS,
  ROLE_ACTIONS,
  PERMISSIONS_ACTIONS,
  EVENT_ACTIONS,
  PLAYER_ACTIONS,
  PLAYER_CLAIM_ACTIONS,
  ATTENDANCE_CLAIM_ACTIONS,
  STRIPE_ACCOUNT_ACTIONS,
  TICKET_ORDER_ACTIONS,
  TICKET_TYPE_ACTIONS,
  ARTICLE_ACTIONS,
  EXPECTATION_ACTIONS,
  EVENT_LOCATION_ACTIONS,
  FORMAT_ACTIONS,
  GAME_ACTIONS,
  HISTORY_ACTIONS,
  HOME_ACTIONS,
  HOSTING_ACTIONS,
  SPONSOR_ACTIONS,
  TAG_ACTIONS,
  TESTIMONIAL_ACTIONS,
  VENUE_ACTIONS,
  UPLOAD_ACTIONS,
  I18N_ACTIONS,
  EMAIL_ACTIONS,
  FUZZY_SEARCH_ACTIONS,
  CONTENT_TYPE_BUILDER_ACTIONS,
  MEDIA_FOLDER_ACTIONS,
  MEDIA_FILE_ACTIONS,
} from "./actions"

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // ==================== PUBLIC ROLE ====================
  // These are accessible to everyone, including unauthenticated users

  // Authentication (public)
  { action: AUTH_ACTIONS.CALLBACK, minimumRole: ROLE_TYPES.PUBLIC },
  { action: AUTH_ACTIONS.CONNECT, minimumRole: ROLE_TYPES.PUBLIC },
  { action: AUTH_ACTIONS.REGISTER, minimumRole: ROLE_TYPES.PUBLIC },

  // Content (public)
  { action: EXPECTATION_ACTIONS.FIND, minimumRole: ROLE_TYPES.PUBLIC },

  // User me (needed for auth flow)
  { action: USER_ACTIONS.ME, minimumRole: ROLE_TYPES.PUBLIC },

  // ==================== AUTHENTICATED ROLE ====================
  // These require authentication but no specific player/organizer status

  // Events (read)
  { action: EVENT_ACTIONS.FIND, minimumRole: ROLE_TYPES.AUTHENTICATED },
  { action: EVENT_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.AUTHENTICATED },

  // Player profile management
  { action: PLAYER_ACTIONS.FIND_ME, minimumRole: ROLE_TYPES.AUTHENTICATED },
  { action: PLAYER_ACTIONS.UPDATE_ME, minimumRole: ROLE_TYPES.AUTHENTICATED },
  { action: PLAYER_ACTIONS.CREATE_FOR_USER, minimumRole: ROLE_TYPES.AUTHENTICATED },
  { action: PLAYER_ACTIONS.AUTO_LINK, minimumRole: ROLE_TYPES.AUTHENTICATED },

  // Player claim process (for users without a player yet)
  { action: PLAYER_CLAIM_ACTIONS.CHECK_MATCH, minimumRole: ROLE_TYPES.AUTHENTICATED },
  { action: PLAYER_CLAIM_ACTIONS.GET_SUGGESTIONS, minimumRole: ROLE_TYPES.AUTHENTICATED },
  { action: PLAYER_CLAIM_ACTIONS.SUBMIT_CLAIM, minimumRole: ROLE_TYPES.AUTHENTICATED },
  { action: PLAYER_CLAIM_ACTIONS.CANCEL_CLAIM, minimumRole: ROLE_TYPES.AUTHENTICATED },
  { action: PLAYER_CLAIM_ACTIONS.FIND_MY_CLAIMS, minimumRole: ROLE_TYPES.AUTHENTICATED },

  // Attendance claims (basic)
  { action: ATTENDANCE_CLAIM_ACTIONS.SEARCH_EVENTS, minimumRole: ROLE_TYPES.AUTHENTICATED },
  { action: ATTENDANCE_CLAIM_ACTIONS.GET_OVER_EVENTS, minimumRole: ROLE_TYPES.AUTHENTICATED },
  { action: ATTENDANCE_CLAIM_ACTIONS.GET_MY_CLAIMS, minimumRole: ROLE_TYPES.AUTHENTICATED },
  { action: ATTENDANCE_CLAIM_ACTIONS.GET_PENDING_FOR_PLAYER, minimumRole: ROLE_TYPES.AUTHENTICATED },
  { action: ATTENDANCE_CLAIM_ACTIONS.SUBMIT_CLAIM, minimumRole: ROLE_TYPES.AUTHENTICATED },
  { action: ATTENDANCE_CLAIM_ACTIONS.CANCEL_CLAIM, minimumRole: ROLE_TYPES.AUTHENTICATED },

  // ==================== PLAYER ROLE ====================
  // These require a linked player profile

  // Profile pictures
  { action: PLAYER_ACTIONS.UPLOAD_PICTURE, minimumRole: ROLE_TYPES.PLAYER },
  { action: PLAYER_ACTIONS.DELETE_PICTURE, minimumRole: ROLE_TYPES.PLAYER },

  // Player claims - players can approve/reject claims on their own profile
  { action: PLAYER_CLAIM_ACTIONS.GET_PENDING_CLAIMS, minimumRole: ROLE_TYPES.PLAYER },
  { action: PLAYER_CLAIM_ACTIONS.APPROVE_CLAIM, minimumRole: ROLE_TYPES.PLAYER },
  { action: PLAYER_CLAIM_ACTIONS.REJECT_CLAIM, minimumRole: ROLE_TYPES.PLAYER },

  // Ticket ordering
  { action: TICKET_ORDER_ACTIONS.GET_MY_ORDERS, minimumRole: ROLE_TYPES.PLAYER },
  { action: TICKET_ORDER_ACTIONS.GET_ORDER_STATUS, minimumRole: ROLE_TYPES.PLAYER },
  { action: TICKET_ORDER_ACTIONS.INITIATE_ORDER, minimumRole: ROLE_TYPES.PLAYER },
  { action: TICKET_ORDER_ACTIONS.REQUEST_REFUND, minimumRole: ROLE_TYPES.PLAYER },

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

  // Player management (for event organizers)
  { action: PLAYER_ACTIONS.LIST_PLAYERS, minimumRole: ROLE_TYPES.HOST },
  { action: PLAYER_ACTIONS.GET_PLAYER_FOR_EDIT, minimumRole: ROLE_TYPES.HOST },
  { action: PLAYER_ACTIONS.UPDATE_PLAYER, minimumRole: ROLE_TYPES.HOST },
  { action: PLAYER_ACTIONS.UPDATE_PLAYER_POSITION, minimumRole: ROLE_TYPES.HOST },

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

  // Format management
  { action: FORMAT_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: FORMAT_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: FORMAT_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Games full CRUD
  { action: GAME_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: GAME_ACTIONS.FIND_ONE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: GAME_ACTIONS.CREATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: GAME_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: GAME_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // History management
  { action: HISTORY_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: HISTORY_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: HISTORY_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Home management
  { action: HOME_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: HOME_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: HOME_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

  // Hosting management
  { action: HOSTING_ACTIONS.FIND, minimumRole: ROLE_TYPES.FOUNDER },
  { action: HOSTING_ACTIONS.UPDATE, minimumRole: ROLE_TYPES.FOUNDER },
  { action: HOSTING_ACTIONS.DELETE, minimumRole: ROLE_TYPES.FOUNDER },

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

  // Stripe webhook (public - needed for Stripe callbacks)
  { action: TICKET_ORDER_ACTIONS.HANDLE_STRIPE_WEBHOOK, minimumRole: ROLE_TYPES.FOUNDER },

  // Available tickets (public for event pages)
  { action: TICKET_ORDER_ACTIONS.GET_AVAILABLE_TICKETS, minimumRole: ROLE_TYPES.FOUNDER },
]
