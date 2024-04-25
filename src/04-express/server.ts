// yarn tsx src/03-express-app/server.ts

// This file demonstrates how to stream from the server the chunks as
// a new-line separated JSON-encoded stream.

import OpenAI from "openai"
import dotenv from "dotenv"
import express, { Request, Response } from "express"
import cors from "cors"

dotenv.config()
const openai = new OpenAI()
const app = express()

app.use(cors())

app.use(express.text())

/*
 * Define the tools that the chat completion can use:
 *
 * 1. get_artists: Get a list of artists on Artsy
 * 2. get_curated_artists: Get a list of curated artists on Artsy
 */

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_user_profile",
      description: `Get information associated with a user profile on artsy.`,
      parameters: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description:
              "user's access token, which can be used to fetch user information from artsy.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_curated_artists",
      description: `Get a list of curated artists on Artsy. These are artists whose works have been highlighted by Artsy curators, and may change from week to week.`,
      parameters: {
        type: "object",
        properties: {
          size: {
            type: "integer",
            description: "The number of artists to return",
            default: 5,
            minimum: 1,
            maximum: 20,
          },
        },
      },
    },
  },
]

app.post("/", async (req: Request, res: Response) => {
  try {
    console.log("Received request:", req.body)

    console.log("Received request:", req.headers)

    res.header("Content-Type", "text/plain")

    const response = await openai.chat.completions.create({
      messages: [{ role: "user", content: req.body }],
      model: "gpt-3.5-turbo",
      tools,
    })

    console.log(JSON.stringify(response))

    if (response.choices[0].finish_reason === "tool_calls") {
      const name = response.choices[0].message.tool_calls?.[0].function.name
      // const args = JSON.parse(
      //   response.choices[0].message.tool_calls?.[0].function.arguments || "null"
      // )

      let profile
      if ("get_user_profile" === name) {
        const args = {
          token: req.headers["x-access-token"] as string,
          size: 10,
        }

        profile = await get_user_profile(args)
        console.log("User profile:", profile, args)
      }

      let generatedResponse
      if (profile) {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          temperature: 0,
          messages: [
            {
              role: "user",
              content: `
              Based on the following JSON context, return a paragraph listing the artist mentiond.

              Context
              '''
              ${JSON.stringify(profile, null, 2)}
              '''
          `,
            },
          ],
        })
        console.log(response.choices[0].message.content)
        generatedResponse = response.choices[0].message.content
      }

      res.write(JSON.stringify(generatedResponse || "PROFILE MISSING"))
    }

    res.end()
  } catch (e) {
    console.error(e)
  }
})

app.listen("3000", () => {
  console.log("Started proxy express server")
})

async function get_user_profile(args: { size: number; token: string }) {
  const query = `query getUserProfile($size: Int!) {
    me {
      internalID
      name
      email
      followsAndSaves {
        artistsConnection(first: $size) {
          edges {
            node {
              artist {
                name
              }
            }
          }
        }
      }
    }
  }`

  const variables = {
    size: args.size,
  }

  const headers = {
    "X-ACCESS-TOKEN": args.token,
    "Content-Type": "application/json",
  }

  const response = await metaphysics({ query, variables, headers })

  const profile = response.data.me

  return profile
}

/*
 * Define the API helpers the the function calls will make use of
 */

async function metaphysics(args: {
  query: string
  variables: Record<string, unknown>
  headers: Record<string, string>
}) {
  const { query, variables, headers } = args

  const url = "https://metaphysics-staging.artsy.net/v2"

  const body = JSON.stringify({ query, variables })
  const options = { method: "POST", headers, body }

  const response = await fetch(url, options)
  const json = await response.json()
  return json
}
