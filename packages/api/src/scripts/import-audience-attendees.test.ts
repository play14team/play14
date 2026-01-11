import { describe, it, expect } from "vitest"
import { mkdtempSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import {
  loadAttendeeContacts,
  mergeContacts,
  parseLinkedInField,
} from "../services/import-audience-attendees"

const createTempCsvDir = (csvContent: string): string => {
  const dir = mkdtempSync(join(tmpdir(), "play14-import-"))
  writeFileSync(join(dir, "attendees.csv"), csvContent, "utf8")
  return dir
}

describe("import-audience-attendees helpers", () => {
  it("parses explicit visibility opt-out flags", () => {
    expect(parseLinkedInField("No")).toEqual({ visible: false })
    expect(parseLinkedInField("Non")).toEqual({ visible: false })
    expect(parseLinkedInField("False")).toEqual({ visible: false })
    expect(parseLinkedInField("Yes")).toEqual({ visible: true })
  })

  it("loads attendee contacts and preserves visibility/tshirt/food fields", () => {
    const csv = [
      "Attendee's Email address,Attendee's first name,Attendee's name,\"I want to appear on the #play14 website, and here is my LinkedIn profile url\",What is your T-shirt size and shape,\"Please notify us of any specific food diet (vegetarian, vegan, gluten-free, lactose-free, ...)\"",
      "a@example.com,Ann,Able,No,XL,vegan",
      "b@example.com,Bob,Baker,https://linkedin.com/in/bob,M,gluten-free",
    ].join("\n")
    const dir = createTempCsvDir(csv)

    try {
      const contacts = loadAttendeeContacts(dir)
      expect(contacts).toHaveLength(2)
      expect(contacts[0]).toMatchObject({
        email: "a@example.com",
        firstName: "Ann",
        lastName: "Able",
        tshirtSize: "XL",
        foodPreferences: "vegan",
        visible: false,
      })
      expect(contacts[0].linkedinUrl).toBeUndefined()
      expect(contacts[1]).toMatchObject({
        email: "b@example.com",
        firstName: "Bob",
        lastName: "Baker",
        tshirtSize: "M",
        foodPreferences: "gluten-free",
        visible: true,
      })
      expect(contacts[1].linkedinUrl).toBe("https://linkedin.com/in/bob")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("merges contacts by email and preserves opt-out visibility", () => {
    const attendeeContacts = [
      {
        email: "Test@Example.com",
        firstName: "Anna",
        visible: false,
        sources: ["attendee"],
      },
    ]
    const mailchimpContacts = [
      {
        email: "test@example.com",
        lastName: "Smith",
        sources: ["mailchimp"],
      },
    ]

    const merged = mergeContacts(attendeeContacts, mailchimpContacts)
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      email: "test@example.com",
      firstName: "Anna",
      lastName: "Smith",
      visible: false,
    })
    expect(merged[0].sources.sort()).toEqual(["attendee", "mailchimp"])
  })
})
