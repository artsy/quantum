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

// This endpoint can be called with:
//
//   curl 127.0.0.1:3000 -N -X POST -H 'Content-Type: text/plain' \
//     --data 'Can you explain why dogs are better than cats?'
//
// Or consumed with fetch:
//
// fetch('http://localhost:3000', {
//   method: 'POST',
//   body: 'Tell me why dogs are better than cats',
// }).then(async res => {
//   const runner = ChatCompletionStreamingRunner.fromReadableStream(res)
// })
//
// See examples/stream-to-client-browser.ts for a more complete example.
app.post("/", async (req: Request, res: Response) => {
  try {
    console.log("Received request:", req.body)

    console.log("Received request:", req.headers)

    const stream = openai.beta.chat.completions.stream({
      model: "gpt-4o",
      stream: true,
      messages: [
        {
          role: "system",
          content:
            `You are a helpful assistant that can provide information about the art world via Artsy's platform. ` +
            ` ` +
            `If the user asks you to describe their profile or taste in art, you should respond with a the string PROFILE.`,
        },
        { role: "user", content: req.body },
      ],
      tools,
    })

    res.header("Content-Type", "text/plain")
    // @ts-expect-error ReadableStream on different environments can be strange
    for await (const chunk of stream.toReadableStream()) {
      res.write(chunk)
    }

    res.end()
  } catch (e) {
    console.error(e)
  }
})

app.listen("3000", () => {
  console.log("Started proxy express server")
})

// TODO: remove once we use the get_user_profile function
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function get_user_profile() {
  return { Foo: "Bar" }
}
