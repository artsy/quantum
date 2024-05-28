import { tool } from "ai"
import { metaphysics } from "system/metaphysics"
import { z } from "zod"

export const fetchUser = tool({
  description: `
    Fetch the current user's record, which contains basic information about the user,
    including their name, profession and location.
  `,

  parameters: z.object({}),

  execute: async () => {
    const accessToken = process.env.USER_ACCESS_TOKEN

    const query = `query {
      me {
        name
        initials
        email
        bio
        profession
        location {
          internalID
          city
          summary
          state
          country
          coordinates {
            lat
            lng
          }
        }
      }
    }`

    const variables = {}

    const headers = {
      "X-ACCESS-TOKEN": accessToken!,
    }

    const data = await metaphysics({ query, variables, headers })
    return data.me
  },
})
