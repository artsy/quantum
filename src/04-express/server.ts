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

      if ("get_user_profile" === name) {
        const profile = get_user_profile()
        res.write(JSON.stringify(profile))
      }
    }

    res.end()
  } catch (e) {
    console.error(e)
  }
})

app.listen("3000", () => {
  console.log("Started proxy express server")
})

function get_user_profile() {
  return { Foo: "Bar" }
}
