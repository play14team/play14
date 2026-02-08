const DEFAULT_FROM_NAME = "#play14 community"

/**
 * Parse a "Name <email>" or plain "email" string into { email, name } for Sender.net API.
 * Sender.net requires from.name to always be present, so a default is used for plain emails.
 */
function parseEmailAddress(address) {
  const match = address.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() }
  }
  return { email: address.trim(), name: DEFAULT_FROM_NAME }
}

module.exports = {
  init(providerOptions, settings) {
    return {
      async send(options) {
        const { from, to, replyTo, subject, text, html } = options

        const fromAddress = from || settings.defaultFrom || ""
        const parsedFrom = parseEmailAddress(fromAddress)

        const body = {
          from: parsedFrom,
          to: { email: to },
          subject,
        }

        if (html) body.html = html
        if (text) body.text = text
        if (replyTo || settings.defaultReplyTo) {
          body.reply_to = { email: replyTo || settings.defaultReplyTo }
        }

        const response = await fetch("https://api.sender.net/v2/message/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${providerOptions.apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Sender.net API error (${response.status}): ${errorText}`)
        }

        return response.json()
      },
    }
  },
}
