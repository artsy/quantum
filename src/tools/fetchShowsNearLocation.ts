import { tool } from "ai"
import { extractNodes, metaphysics } from "@/system/metaphysics"
import { z } from "zod"

const DEFAULT_NUMBER_OF_SHOWS = 100
const MAX_NUMBER_OF_SHOWS = 200

export const fetchShowsNearLocation = tool({
  description: `
    Fetch a list of exhibitions or shows near a given lat/lng location
  `,

  parameters: z.object({
    longitude: z
      .number()
      .min(-180)
      .max(180)
      .default(DEFAULT_NUMBER_OF_SHOWS)
      .describe(`The longitude of the location to search near`),
    latitude: z
      .number()
      .min(-90)
      .max(90)
      .default(DEFAULT_NUMBER_OF_SHOWS)
      .describe(`The latitude of the location to search near`),
    size: z
      .number()
      .max(MAX_NUMBER_OF_SHOWS)
      .default(DEFAULT_NUMBER_OF_SHOWS)
      .describe(`The maximum number of shows to return`),
  }),

  execute: async (args) => {
    const size = args.size ?? DEFAULT_NUMBER_OF_SHOWS

    let shows: unknown[] = []
    let lastCursor = null

    while (shows.length < size) {
      const query = `query ($size: Int, $lat: Float!, $lng: Float!, $after: String) {
        city(near: {lat: $lat, lng: $lng}) {
          showsConnection(first: $size, after: $after, status: RUNNING) {
            totalCount
            edges {
              cursor
              node {
                name
                venue: partner {
                  ... on Partner {
                    name
                    type
                  }
                }
                endAt
                location {
                  city
                }
                artists {
                  name
                }
              }
            }
          }
        }
      }
      `

      const variables = {
        size: size - shows.length,
        lat: args.latitude,
        lng: args.longitude,
        after: lastCursor,
      }

      const headers = {}

      const data = await metaphysics({ query, variables, headers })
      const newShows = extractNodes(data.city.showsConnection)
      shows = [...shows, ...newShows]

      const edges = data.city.showsConnection.edges
      lastCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null

      if (!lastCursor) {
        break
      }
    }

    return shows
  },
})
