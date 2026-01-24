/**
 * Migration: Seed liked items
 *
 * Bootstraps the "Things we like" showcase with initial data.
 * Links items to contributors (players) where applicable.
 */

const LIKED_ITEMS = [
  {
    name: "ISAGA",
    description:
      "International Simulation and Gaming Association - a global community promoting simulation and gaming for education, training, and research.",
    url: "https://isaga.com/",
    contributors: [],
  },
  {
    name: "Debriefing cube",
    description:
      "A powerful facilitation tool for structured debriefing sessions, helping teams reflect on experiences and extract learning.",
    url: "https://www.kilearning.net/TheDebriefingCube_EN_CC-BY_v26.pdf",
    contributors: ["Chris Caswell", "Julian Kea"],
  },
  {
    name: "Playify",
    description:
      "Transform your workshops and meetings with playful approaches that boost engagement and creativity.",
    url: "https://playify.work/",
    contributors: ["Hanna Karlsson"],
  },
  {
    name: "Team Catalyst",
    description:
      "A card-based toolkit helping teams self-diagnose strengths and identify next steps in minutes.",
    url: "https://teamcatalyst.uk/en/",
    contributors: ["Chris Caswell"],
  },
  {
    name: "Story Cubes",
    description:
      "Rory's Story Cubes - dice with images that spark creativity and storytelling in games and workshops.",
    url: "https://www.storycubes.com/en/",
    contributors: [],
  },
  {
    name: "Happy Salmon",
    description:
      "A fast-paced, high-energy card game perfect for icebreakers and energizers in workshops.",
    url: "https://boardgamegeek.com/boardgame/194626/happy-salmon",
    contributors: [],
  },
]

export async function up(knex) {
  console.log("Starting migration: Seed liked items")

  const hasLikedItemsTable = await knex.schema.hasTable("liked_items")
  if (!hasLikedItemsTable) {
    console.log("liked_items table does not exist, skipping migration")
    return
  }

  const hasPlayersTable = await knex.schema.hasTable("players")
  if (!hasPlayersTable) {
    console.log("players table does not exist, skipping migration")
    return
  }

  // Find the junction table for liked_items <-> players
  const junctionTableCandidates = [
    "liked_items_contributors_lnk",
    "liked_items_contributors_links",
    "liked_items_players_lnk",
    "liked_items_players_links",
  ]

  let junctionTable = null
  for (const table of junctionTableCandidates) {
    if (await knex.schema.hasTable(table)) {
      junctionTable = table
      break
    }
  }

  // If no junction table found, try to find it via information_schema
  if (!junctionTable) {
    try {
      const rows = await knex("information_schema.tables")
        .select("table_name")
        .where({ table_schema: "public" })
        .where("table_name", "like", "liked_items%lnk%")
      if (rows.length > 0) {
        junctionTable = rows[0].table_name
      }
    } catch (error) {
      console.log("Unable to query information_schema for junction table")
    }
  }

  if (!junctionTable) {
    console.log(
      "Junction table for liked_items contributors not found, will insert items without contributors"
    )
  } else {
    console.log(`Found junction table: ${junctionTable}`)
  }

  // Get all players for lookup
  const players = await knex("players").select("id", "name")
  const playerByName = new Map()
  for (const player of players) {
    playerByName.set(player.name.toLowerCase(), player.id)
  }

  let insertedCount = 0
  let linkedCount = 0

  for (const item of LIKED_ITEMS) {
    // Check if item already exists
    const existing = await knex("liked_items").where({ name: item.name }).first()
    if (existing) {
      console.log(`Skipping "${item.name}" - already exists`)
      continue
    }

    // Generate document_id (UUID-like format for Strapi 5)
    const documentId = generateDocumentId()

    // Insert the liked item
    const [inserted] = await knex("liked_items")
      .insert({
        document_id: documentId,
        name: item.name,
        description: item.description,
        url: item.url,
        created_at: new Date(),
        updated_at: new Date(),
        published_at: new Date(),
      })
      .returning("id")

    const likedItemId = inserted.id || inserted
    insertedCount++
    console.log(`Inserted "${item.name}" with id ${likedItemId}`)

    // Link contributors if junction table exists and contributors are specified
    if (junctionTable && item.contributors.length > 0) {
      // Get junction table column info
      const columns = await knex(junctionTable).columnInfo()
      const columnNames = Object.keys(columns)

      // Find the column names for liked_item and player references
      const likedItemColumn = columnNames.find(
        (name) => name.includes("liked_item") && name.endsWith("_id")
      )
      const playerColumn = columnNames.find(
        (name) => name.includes("player") && name.endsWith("_id")
      )

      if (!likedItemColumn || !playerColumn) {
        console.log(
          `Could not find proper columns in ${junctionTable}, skipping contributor links`
        )
        continue
      }

      // Find any order columns that exist
      const likedItemOrderCol = columnNames.find(
        (name) => name.includes("liked_item") && name.includes("order")
      )
      const playerOrderCol = columnNames.find(
        (name) => name.includes("player") && name.includes("order")
      )

      console.log(`  Junction table columns: ${columnNames.join(", ")}`)

      let contributorOrder = 0
      for (const contributorName of item.contributors) {
        contributorOrder++
        const playerId = playerByName.get(contributorName.toLowerCase())
        if (!playerId) {
          console.log(`  Player "${contributorName}" not found, skipping link`)
          continue
        }

        // Check if link already exists
        const existingLink = await knex(junctionTable)
          .where({ [likedItemColumn]: likedItemId, [playerColumn]: playerId })
          .first()

        if (!existingLink) {
          const linkData = {
            [likedItemColumn]: likedItemId,
            [playerColumn]: playerId,
          }

          // Add order columns if they exist
          if (likedItemOrderCol) {
            linkData[likedItemOrderCol] = contributorOrder
          }
          if (playerOrderCol) {
            linkData[playerOrderCol] = 1
          }

          await knex(junctionTable).insert(linkData)
          linkedCount++
          console.log(`  Linked "${contributorName}" to "${item.name}"`)
        }
      }
    }
  }

  console.log(
    `Migration complete: ${insertedCount} items inserted, ${linkedCount} contributor links created`
  )
}

export async function down(knex) {
  console.log("Starting rollback: Remove seeded liked items")

  const hasTable = await knex.schema.hasTable("liked_items")
  if (!hasTable) {
    console.log("liked_items table does not exist, skipping rollback")
    return
  }

  const itemNames = LIKED_ITEMS.map((item) => item.name)

  // Delete the seeded items (cascade will handle junction table)
  const deleted = await knex("liked_items").whereIn("name", itemNames).del()

  console.log(`Rollback complete: ${deleted} items removed`)
}

function generateDocumentId() {
  // Generate a random document ID in Strapi 5 format
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
