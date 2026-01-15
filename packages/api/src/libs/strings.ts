import slugify from "slugify"

export function eventToSlug(name: string, start: string | Date): string {
  const date = new Date(start)
  const month = (date.getMonth() + 1).toString()
  return `${toSlug(name)}-${month.padStart(2, "0")}`
}

export function toSlug(value: string): string {
  const normalized = normalize(value)
  return slugify(normalized, { remove: /[*+~.,&()'"!:@#?]/g }).toLowerCase()
}

export function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * Generate a username from a full name or first/last name.
 * The username is in the format "firstname.lastname" (lowercase, no accents).
 * Examples:
 * - "Jim Morrison" → "jim.morrison"
 * - "Janis Joplin" → "janis.joplin"
 * - "John Lennon" → "john.lennon"
 * - "José García" → "jose.garcia"
 * - "Jose Maria da Silva Goncalves" → "jose.maria.da.silva.goncalves"
 *
 * @param fullName - Full name (e.g., "Jim Morrison")
 * @param firstName - Optional first name (takes precedence over fullName)
 * @param lastName - Optional last name (takes precedence over fullName)
 * @returns Username in format "firstname.lastname"
 */
export function nameToUsername(
  fullName?: string,
  firstName?: string,
  lastName?: string
): string {
  // Build the name from parts or use fullName
  const name = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ") || fullName?.trim()

  if (!name) {
    return "player"
  }

  // Use slugify (handles accents, special chars) then replace dashes with dots
  const slug = slugify(name, { lower: true, strict: true })
  return slug.replace(/-/g, ".") || "player"
}
