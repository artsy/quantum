import { tool } from "ai"
import { extractNodes, metaphysics } from "@/system/metaphysics"
import { z } from "zod"

const DEFAULT_NUMBER_OF_ARTISTS = 20

export const fetchUserArtistFollows = tool({
  description: `
    Fetch a list of artists that the current user is following.
  `,

  parameters: z.object({
    size: z
      .number()
      .max(50)
      .default(DEFAULT_NUMBER_OF_ARTISTS)
      .describe(
        `The maximum number of artists to return, default to ${DEFAULT_NUMBER_OF_ARTISTS}`
      ),
  }),

  execute: async (args) => {
    const accessToken = process.env.USER_ACCESS_TOKEN
    const size = args.size ?? DEFAULT_NUMBER_OF_ARTISTS

    let artistFollows: unknown[] = []
    let lastCursor = null

    while (artistFollows.length < size) {
      const query = `query($size: Int!, $after: String) {
      me {
        followsAndSaves {
          artistsConnection(first: $size, after: $after) {
            edges {
              cursor
              node {
                artist {
                  name
                  formattedNationalityAndBirthday
                }
              }
            }
          }
        }
      }
    }`

      const variables = {
        size: size - artistFollows.length,
        after: lastCursor,
      }

      const headers = {
        "X-ACCESS-TOKEN": accessToken!,
      }

      const data = await metaphysics({ query, variables, headers })
      const newArtistFollows = extractNodes(
        data.me.followsAndSaves.artistsConnection
      )
      artistFollows = [...artistFollows, ...newArtistFollows]

      const edges = data.me.followsAndSaves.artistsConnection.edges
      lastCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null

      if (!lastCursor) {
        break
      }
    }

    return artistFollows
  },
})
