import { describe, expect, it } from "vitest"
import {
  decideFinding,
  isLinkedinProfileUrl,
  linkedinUrlOf,
  markedAssetId,
  parsePhotoUrl,
} from "./linkedin-avatars"

const SIGNED_100 =
  "https://media.licdn.com/dms/image/v2/C5103AQEnoLfJAw9kIQ/profile-displayphoto-shrink_100_100/profile-displayphoto-shrink_100_100/0/1541593388921?e=1788998400&v=beta&t=abc"
const SIGNED_400 =
  "https://media.licdn.com/dms/image/v2/D5603AQFrABzlImlYsQ/profile-displayphoto-scale_400_400/B56Z8sUM2EHUAY-/0/1783154922488?e=2147483647&v=beta&t=def"

describe("isLinkedinProfileUrl", () => {
  it("accepts linkedin.com and its subdomains over https", () => {
    expect(isLinkedinProfileUrl("https://www.linkedin.com/in/dannytongkm/")).toBe(true)
    expect(isLinkedinProfileUrl("https://linkedin.com/in/x")).toBe(true)
    expect(isLinkedinProfileUrl("https://sg.linkedin.com/in/x")).toBe(true)
  })

  it("rejects the SSRF targets a player could put in their profile", () => {
    // socialNetworks[].url is self-service editable and unvalidated, so these
    // are reachable inputs, not hypotheticals.
    expect(isLinkedinProfileUrl("http://169.254.169.254/latest/meta-data/")).toBe(false)
    expect(isLinkedinProfileUrl("https://169.254.169.254/latest/meta-data/")).toBe(false)
    expect(isLinkedinProfileUrl("http://localhost:1337/admin")).toBe(false)
    expect(isLinkedinProfileUrl("file:///etc/passwd")).toBe(false)
  })

  it("rejects hosts that merely contain the brand name", () => {
    expect(isLinkedinProfileUrl("https://linkedin.com.evil.example/in/x")).toBe(false)
    expect(isLinkedinProfileUrl("https://notlinkedin.com/in/x")).toBe(false)
    expect(isLinkedinProfileUrl("https://evil.example/?u=linkedin.com")).toBe(false)
  })

  it("rejects plain http and unparseable input", () => {
    expect(isLinkedinProfileUrl("http://www.linkedin.com/in/x")).toBe(false)
    expect(isLinkedinProfileUrl("linkedin.com/in/x")).toBe(false)
    expect(isLinkedinProfileUrl("")).toBe(false)
  })
})

describe("parsePhotoUrl", () => {
  it("reads the asset id and the rendition size out of the path", () => {
    expect(parsePhotoUrl(SIGNED_100)).toEqual({ assetId: "C5103AQEnoLfJAw9kIQ", size: 100 })
  })

  it("handles scale_ renditions as well as shrink_", () => {
    expect(parsePhotoUrl(SIGNED_400)).toEqual({ assetId: "D5603AQFrABzlImlYsQ", size: 400 })
  })

  it("returns null for anything that is not a sized LinkedIn rendition", () => {
    expect(parsePhotoUrl("https://cdn.play14.org/danny_tong.jpeg")).toBeNull()
    expect(parsePhotoUrl("https://media.licdn.com/dms/image/v2/C51/company-logo/0/1")).toBeNull()
  })

  it("is pinned to media.licdn.com so a hostile page cannot forge a rendition", () => {
    // An attacker-controlled og:image only has to match the path shape;
    // without the host pin it would be uploaded as a player's avatar.
    const forged =
      "https://evil.example/dms/image/v2/FAKEASSET/profile-displayphoto-shrink_400_400/0/1"
    expect(parsePhotoUrl(forged)).toBeNull()
    expect(parsePhotoUrl(forged.replace("evil.example", "media.licdn.com.evil.example"))).toBeNull()
    expect(parsePhotoUrl(SIGNED_400.replace("https://", "http://"))).toBeNull()
  })
})

describe("markedAssetId", () => {
  it("extracts the asset id this repo recorded when it uploaded the file", () => {
    expect(markedAssetId({ id: 1, caption: "linkedin:C5103AQEnoLfJAw9kIQ" })).toBe(
      "C5103AQEnoLfJAw9kIQ"
    )
  })

  it("treats a missing or foreign caption as a human upload", () => {
    expect(markedAssetId({ id: 1, caption: null })).toBeNull()
    expect(markedAssetId({ id: 1, caption: "headshot from the KL event" })).toBeNull()
    expect(markedAssetId({ id: 1, caption: "linkedin:" })).toBeNull()
    expect(markedAssetId(null)).toBeNull()
  })
})

describe("linkedinUrlOf", () => {
  it("picks the LinkedIn entry out of the social networks component", () => {
    const url = linkedinUrlOf({
      documentId: "a",
      name: "Danny Tong",
      socialNetworks: [
        { socialNetworkType: "Instagram", url: "https://instagram.com/x" },
        { socialNetworkType: "LinkedIn", url: "https://www.linkedin.com/in/dannytongkm/" },
      ],
    })
    expect(url).toBe("https://www.linkedin.com/in/dannytongkm/")
  })

  it("returns null when there is no LinkedIn entry", () => {
    expect(linkedinUrlOf({ documentId: "a", name: "x", socialNetworks: [] })).toBeNull()
    expect(linkedinUrlOf({ documentId: "a", name: "x" })).toBeNull()
  })

  it("drops a LinkedIn entry pointing somewhere other than linkedin.com", () => {
    const url = linkedinUrlOf({
      documentId: "a",
      name: "x",
      socialNetworks: [
        { socialNetworkType: "LinkedIn", url: "http://169.254.169.254/latest/meta-data/" },
      ],
    })
    expect(url).toBeNull()
  })
})

describe("decideFinding", () => {
  const candidate = { assetId: "ASSET_NEW", size: 200 }

  it("flags players with no avatar at all", () => {
    expect(decideFinding({ documentId: "a", name: "x" }, candidate)).toBe("missing")
  })

  it("never touches a human-uploaded avatar, even a tiny one", () => {
    const player = { documentId: "a", name: "x", avatar: { id: 9, width: 80, caption: null } }
    expect(decideFinding(player, candidate)).toBeNull()
  })

  it("flags a managed avatar built from a photo the member has since replaced", () => {
    const player = {
      documentId: "a",
      name: "x",
      avatar: { id: 9, width: 400, caption: "linkedin:ASSET_OLD" },
    }
    expect(decideFinding(player, candidate)).toBe("stale")
  })

  it("flags a managed avatar smaller than the rendition now on offer", () => {
    const player = {
      documentId: "a",
      name: "x",
      avatar: { id: 9, width: 100, caption: "linkedin:ASSET_NEW" },
    }
    expect(decideFinding(player, candidate)).toBe("low-resolution")
  })

  it("does not offer a downgrade when we already store a bigger rendition", () => {
    const player = {
      documentId: "a",
      name: "x",
      avatar: { id: 9, width: 400, caption: "linkedin:ASSET_NEW" },
    }
    expect(decideFinding(player, candidate)).toBeNull()
  })

  it("does not re-report an avatar that already matches the offered size", () => {
    const player = {
      documentId: "a",
      name: "x",
      avatar: { id: 9, width: 200, caption: "linkedin:ASSET_NEW" },
    }
    expect(decideFinding(player, candidate)).toBeNull()
  })
})
