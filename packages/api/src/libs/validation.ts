/**
 * Validation utilities using Zod
 *
 * Provides type-safe validation schemas for user input.
 */

import { z, type ZodError, type ZodSchema } from "zod"

/**
 * Extract the first error message from a ZodError
 */
function getFirstError(error: ZodError): string {
  // Zod 4 stores errors in the message as JSON
  try {
    const issues = JSON.parse(error.message)
    if (Array.isArray(issues) && issues.length > 0) {
      return issues[0].message || "Validation failed"
    }
  } catch {
    // Fallback to error.message if parsing fails
  }
  return error.message || "Validation failed"
}

/**
 * Generic validation result type
 */
export type ValidationResult<T> =
  | { valid: true; data: T; error?: undefined }
  | { valid: false; data: null; error: string }

/**
 * Generic validation function for any Zod schema
 */
export function validate<T>(schema: ZodSchema<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input)

  if (result.success) {
    return { valid: true, data: result.data }
  }

  return {
    valid: false,
    data: null,
    error: getFirstError(result.error),
  }
}

/**
 * Email validation schema
 * Validates email format and provides normalized output
 */
export const emailSchema = z
  .string({ message: "Email is required" })
  .trim()
  .min(1, "Email cannot be empty")
  .email("Invalid email format")
  .transform((email) => email.toLowerCase())
  .refine((email) => !/\.\./.test(email), {
    message: "Email cannot contain consecutive dots",
  })
  .refine(
    (email) => {
      const localPart = email.split("@")[0]
      return localPart && !localPart.startsWith(".") && !localPart.endsWith(".")
    },
    { message: "Email local part cannot start or end with a dot" }
  )

/**
 * URL validation schema
 * Accepts http and https URLs
 */
export const urlSchema = z
  .string()
  .trim()
  .refine(
    (url) => {
      if (!url) return true // Allow empty for optional fields
      try {
        // Add protocol if missing to check validity
        const urlToTest = url.match(/^https?:\/\//) ? url : `https://${url}`
        const parsed = new URL(urlToTest)
        return ["http:", "https:"].includes(parsed.protocol)
      } catch {
        return false
      }
    },
    { message: "Invalid URL format" }
  )

/**
 * Name validation schema factory
 * Creates a name validation schema with configurable options
 */
export function createNameSchema(options: {
  field?: string
  minLength?: number
  maxLength?: number
} = {}) {
  const { field = "Name", minLength = 1, maxLength = 100 } = options

  return z
    .string({ message: `${field} is required` })
    .trim()
    .min(minLength, `${field} must be at least ${minLength} character${minLength !== 1 ? "s" : ""}`)
    .max(maxLength, `${field} must be at most ${maxLength} characters`)
    .refine(
      // eslint-disable-next-line no-control-regex
      (name) => !/[\x00-\x1F\x7F]/.test(name),
      { message: `${field} contains invalid characters` }
    )
}

/**
 * Default name schema
 */
export const nameSchema = createNameSchema()

/**
 * Validate an email address
 *
 * @param email - Email address to validate
 * @returns True if email is valid
 */
export function isValidEmail(email: string): boolean {
  const result = emailSchema.safeParse(email)
  return result.success
}

/**
 * Validate and normalize an email address
 *
 * @param email - Email address to validate and normalize
 * @returns Object with valid flag, normalized email, and optional error message
 */
export function validateEmail(email: string): {
  valid: boolean
  email: string | null
  error?: string
} {
  const result = validate(emailSchema, email)

  if (result.valid) {
    return { valid: true, email: result.data }
  }

  return {
    valid: false,
    email: null,
    error: result.error,
  }
}

/**
 * Validate a URL
 *
 * @param url - URL to validate
 * @returns True if URL is valid
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false
  }

  const trimmed = url.trim()
  if (trimmed === "") {
    return false
  }

  const result = urlSchema.safeParse(trimmed)
  return result.success
}

/**
 * Validate a name field (first name, last name, etc.)
 *
 * @param name - Name to validate
 * @param options - Validation options
 * @returns Object with valid flag and optional error
 */
export function validateName(
  name: string,
  options: { minLength?: number; maxLength?: number; field?: string } = {}
): { valid: boolean; name: string | null; error?: string } {
  const schema = createNameSchema(options)
  const result = validate(schema, name)

  if (result.valid) {
    return { valid: true, name: result.data }
  }

  return {
    valid: false,
    name: null,
    error: result.error,
  }
}

/**
 * T-shirt size enum schema
 */
export const tshirtSizeSchema = z.enum(["XS", "S", "M", "L", "XL", "XXL", "XXXL", "none"])

/**
 * Player position enum schema
 */
export const playerPositionSchema = z.enum(["Player", "Host", "Mentor", "Founder"])

/**
 * Social network component schema
 */
export const socialNetworkSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1, "Social network type is required"),
  url: z.string().url("Invalid social network URL"),
})

/**
 * Attendee info validation schema for ticket purchases
 */
export const attendeeSchema = z.object({
  firstName: createNameSchema({ field: "First name", minLength: 1, maxLength: 50 }),
  lastName: createNameSchema({ field: "Last name", minLength: 1, maxLength: 50 }),
  email: emailSchema,
  company: z.string().optional(),
  tshirtSize: tshirtSizeSchema.optional(),
  foodPreferences: z.string().optional(),
  photoConsent: z.boolean().optional(),
})

/**
 * Player update data schema
 */
export const playerUpdateSchema = z.object({
  name: createNameSchema({ field: "Name", minLength: 2, maxLength: 100 }).optional(),
  position: playerPositionSchema.optional(),
  company: z.string().max(100, "Company name too long").nullable().optional(),
  tagline: z.string().max(200, "Tagline too long").nullable().optional(),
  bio: z.string().nullable().optional(), // HTML, sanitized separately
  website: urlSchema.nullable().optional(),
  socialNetworks: z.array(socialNetworkSchema).optional(),
})

/**
 * Ticket order creation schema
 */
export const ticketOrderSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  tickets: z.array(z.object({
    ticketTypeId: z.string().min(1, "Ticket type ID is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1").max(10, "Maximum 10 tickets per type"),
  })).min(1, "At least one ticket is required"),
  attendees: z.array(attendeeSchema).optional(),
  discountCode: z.string().optional(),
})

/**
 * Event claim schema
 */
export const eventClaimSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  message: z.string().max(1000, "Message too long").optional(),
})

// Export types
export type AttendeeInput = z.input<typeof attendeeSchema>
export type Attendee = z.output<typeof attendeeSchema>
export type PlayerUpdateInput = z.input<typeof playerUpdateSchema>
export type PlayerUpdate = z.output<typeof playerUpdateSchema>
export type TicketOrderInput = z.input<typeof ticketOrderSchema>
export type TicketOrder = z.output<typeof ticketOrderSchema>
export type TshirtSize = z.infer<typeof tshirtSizeSchema>
export type PlayerPosition = z.infer<typeof playerPositionSchema>
