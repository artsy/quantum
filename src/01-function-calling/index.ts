/*
 * This example demonstrates how to use the OpenAI API to create a chat completion that can call functions.
 *
 * The toy use case here is to ask for a list of artists. Depending on how the user phrases the question, the LLM
 * will determine the correct function to call, then shape up the results into a nicely formatted response.
 *
 * Usage examples:
 *
 * bun run src/01-function-calling/index.ts "who is popular on artsy right now?" | jq
 * bun run src/01-function-calling/index.ts "who is artsy into these days?" | jq
 * bun run src/01-function-calling/index.ts "who is new on artsy?" | jq
 * bun run src/01-function-calling/index.ts "give me the last 17 artists on artsy, alphabetically" | jq
 */

import dotenv from "dotenv"
import OpenAI from "openai"

dotenv.config()
const openai = new OpenAI() // uses `OPENAI_API_KEY` from .env

/*
 * Get user input
 */

const input =
  process.argv.slice(2).join(" ") || "Who's trending on Artsy right now?"

/*
 * Create the message payload for the chat completion
 */

const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  {
    role: "system",
    content:
      `You are a helpful assistant that can provide information about the art world via Artsy's platform. ` +
      ` ` +
      `If you receive a question that cannot be answered with one of your known tools, do not force a tool response. ` +
      `Instead ask for clarification or say that you don't know how to answer the question. ` +
      ` `,
  },
  {
    role: "user",
    content: input,
  },
]

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
      name: "get_artists",
      description: `Get a list of artists on Artsy. Artists may be sorted chronologically by creation date, alphabetically by name, or in descending order of a popularity/trending score.`,
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
          sort: {
            type: "string",
            description: "The sort order in which to return artists",
            default: "SORTABLE_ID_ASC",
            enum: [
              "CREATED_AT_ASC",
              "CREATED_AT_DESC",
              "SORTABLE_ID_ASC",
              "SORTABLE_ID_DESC",
              "TRENDING_DESC",
            ],
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

async function main() {
  /*
   * Call the chat completion and get the initial response, which may be a simple response or a function call
   */

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0,
    messages,
    tools,
    tool_choice: "auto",
  })

  console.log(JSON.stringify(messages))
  console.log(JSON.stringify(response.choices[0].message))

  /*
   * If the response WAS a function call, then actually call the function (locally defined, further down) to get the result from Artsy's API
   */

  if (response.choices[0].finish_reason === "tool_calls") {
    const name = response.choices[0].message.tool_calls?.[0].function.name
    const args = JSON.parse(
      response.choices[0].message.tool_calls?.[0].function.arguments || "null"
    )

    let artists

    if (name === "get_artists") {
      artists = await get_artists(args)
      console.log(JSON.stringify(artists))
    }

    if (name === "get_curated_artists") {
      artists = await get_curated_artists(args)
      console.log(JSON.stringify(artists))
    }

    if (artists) {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        temperature: 0,
        messages: [
          {
            role: "user",
            content: `
            Based on the following JSON context, return a nicely formatted bullet list of artists.
            Each artist entry should contain a name, nationality, birth/death dates, as well as
            a link to their Artsy profile in the form https://www.artsy.net/artist/<slug>.

            An example entry would look like this:
            - [Vincent van Gogh](https://www.artsy.net/artist/vincent-van-gogh) (Dutch, 1853–1890)

            Make sure you use all of the items in the context.

            Context
            '''
            ${JSON.stringify(artists, null, 2)}
            '''
        `,
          },
        ],
      })

      console.error(response.choices[0].message.content)
    }
  }
}

/*
 * Define the get_artists() and get_curated_artists() functions that can be called by the chat completion
 */

async function get_artists(args: { size: number; sort: string }) {
  const query = `query GetArtists($size: Int!, $sort: ArtistSorts) {
    artists(size: $size, sort: $sort) {
      slug
      name
      formattedNationalityAndBirthday
      counts {
        forSaleArtworks
      }
    }
  }`

  const variables = {
    size: args.size,
    sort: args.sort,
  }

  const response = await metaphysics({ query, variables })
  return response
}

async function get_curated_artists(args: { size: number }) {
  const query = `query GetCuratedArtists($size: Int!) {
    curatedTrendingArtists(first: $size) {
      edges {
        node {
          slug
          name
          formattedNationalityAndBirthday
          counts {
            forSaleArtworks
          }
        }
      }
    }
  }`

  const variables = {
    size: args.size,
  }

  const response = await metaphysics({ query, variables })
  return response
}

/*
 * Define the API helpers the the function calls will make use of
 */

async function metaphysics(args: {
  query: string
  variables: Record<string, unknown>
}) {
  const { query, variables } = args

  const url = "https://metaphysics-production.artsy.net/v2"
  const headers = {
    "Content-Type": "application/json",
  }
  const body = JSON.stringify({ query, variables })
  const options = { method: "POST", headers, body }

  const response = await fetch(url, options)
  const json = await response.json()
  return json
}

main()
