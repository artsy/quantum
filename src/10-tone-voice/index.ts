/*
 * Run this script, passing in the name of a prompt file from the prompts directory, to generate a csv file with the output.
 *
 * Usage example:
 *
 * yarn tsx src/10-tone-voice 01-baseline
 *
 */

import OpenAI from "openai"
import dotenv from "dotenv"
import chalk from "chalk"
import fs from "fs"
import path from "path"

dotenv.config()
const openai = new OpenAI()

const userID = process.env.RECOMMENDATIONS_USER_ID
const accessToken = process.env.RECOMMENDATIONS_USER_ACCESS_TOKEN
const input = process.argv.slice(2).join(" ")
const promptPath = path.join(__dirname, "prompts", `${input}.ts`)

if (!userID || !accessToken) {
  throw new Error(
    "Please provide a RECOMMENDATIONS_USER_ID and corresponding RECOMMENDATIONS_USER_ACCESS_TOKEN in the .env file to run this experiment"
  )
}

if (!fs.existsSync(promptPath)) {
  throw new Error(
    "Please provide a valid file name from the prompts directory as an argument to this script. HINT: Don't include the file extension."
  )
}

// Settings

/** fetch this many candidates from each of the recommendation fields */
const NUM_CANDIDATES_PER_FIELD = 10

/** applies to the `artworksForUser` field */
const INCLUDE_BACKFILL = true

/** for detailed logging of traffic to/from LLM and MP */
const VERBOSE = false

const TEMPERATURE = 0

// Main

async function main() {
  const { systemPrompt } = await import(`./prompts/${input}`) // Fine for quick isolated tool, but don't copy this anti-pattern.

  console.log(chalk.bold(`Fetching recommendations for user ${userID}:\n`))

  // initial message list

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt(input, TEMPERATURE) },
  ]

  // first response

  const firstResponse = await getCompletion(messages, {
    temperature: TEMPERATURE,
  })

  // second response, based on tool call

  if (isTool(firstResponse)) {
    messages.push(firstResponse.choices[0].message)

    const toolResult = await getToolResult(firstResponse)
    messages.push(toolResult)
  }

  const secondResponse: OpenAI.Chat.Completions.ChatCompletion | undefined =
    await getCompletion(messages, { temperature: TEMPERATURE })

  if (secondResponse !== undefined) {
    const { content } = secondResponse.choices[0].message
    console.log(chalk.bold("\nFinal response"))
    console.log("\n", chalk.bold.blue(content))
    writeOutput(content!)
  }
}

async function getCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: { temperature: number }
) {
  console.log(chalk.white("\nGetting completion from OpenAI"))
  VERBOSE && console.log(chalk.cyan.dim("\n> Input >\n"))
  VERBOSE && console.log(chalk.cyan.dim(JSON.stringify(messages, null, 2)))

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: options.temperature,
    messages,
    tools,
  })
  VERBOSE && console.log(chalk.green("\n< Output <\n"))
  VERBOSE && console.log(chalk.green.dim(JSON.stringify(response, null, 2)))

  return response
}

function isTool(response: OpenAI.Chat.Completions.ChatCompletion) {
  return response.choices[0].finish_reason === "tool_calls"
}

async function getToolResult(
  response: OpenAI.Chat.Completions.ChatCompletion
): Promise<OpenAI.Chat.ChatCompletionToolMessageParam> {
  console.log(chalk.white("\nGetting tool result from Artsy"))

  const { tool_calls: toolCalls } = response.choices[0].message

  VERBOSE && console.log(chalk.cyan.dim("\n> Input >\n"))
  VERBOSE && console.log(chalk.cyan.dim(JSON.stringify(toolCalls, null, 2)))

  const firstToolCall = toolCalls![0]

  const { id } = firstToolCall
  const { name } = firstToolCall.function

  let result: unknown

  if (name === "getCollectorData") {
    result = await getCollectorData()
  } else {
    throw new Error(`Unknown tool call: ${name}`)
  }

  VERBOSE && console.log(chalk.magenta("\n< Tool result <\n"))
  VERBOSE && console.log(chalk.magenta.dim(JSON.stringify(result, null, 2)))

  return {
    role: "tool",
    tool_call_id: id,
    content: JSON.stringify(result, null, 2),
  }
}

async function getCollectorData() {
  const query = `
  query ArtworkRecommendations($userID: String!, $size: Int!, $includeBackfill: Boolean!) {
    who: me {
      email
    }
    artworksForUser(userId: $userID, includeBackfill: $includeBackfill, first: $size) {
      edges {
        node {
          ...artwork
        }
      }
    }
    me {
      internalID
      name
      email
      bio
      followsAndSaves {
        artistsConnection(first: $size) {
          edges {
            node {
              artist {
                name
                blurb
              }
            }
          }
        }
        genesConnection(first: 10) {
          edges {
            node {
              gene {
                name
              }
            }
          }
        }
      }
      artworkRecommendations(first: $size) {
        edges {
          node {
            ...artwork
          }
        }
      }
      recommendedArtworks(first: $size) {
        edges {
          node {
            ...artwork
          }
        }
      }
    }
    user(id: $userID) {
      inquiredArtworksConnection(first: $size) {
        edges {
          node {
            ...artwork
          }
        }
      }
    }
  }

  fragment artwork on Artwork {
    slug
    title
    date
    category
    artist {
      name
      gender
      nationality
      birthday
    }
    image {
      url(version: ["small", "square"])
    }
    rarity: attributionClass {
      name
    }
    medium: mediumType {
      name
    }
    materials: medium
    price: saleMessage
  }
`

  const variables = {
    userID: userID,
    size: NUM_CANDIDATES_PER_FIELD,
    includeBackfill: INCLUDE_BACKFILL,
  }

  const headers = {
    "X-Access-Token": accessToken!,
  }

  const response = await metaphysics({ query, variables, headers })

  return response
}

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getCollectorData",
      description:
        "A profile of the collector, including actions they have taken on artsy.net, and a list of artworks that Artsy has recommended for the user (based on existing recommendation pipelines)",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
]

async function metaphysics(args: {
  query: string
  variables: Record<string, unknown>
  headers: Record<string, string>
}) {
  const { query, variables, headers } = args

  console.log(chalk.white("\nQuerying Metaphysics"))
  VERBOSE && console.log(chalk.white.dim(JSON.stringify({ variables })))
  VERBOSE && console.log(chalk.white.dim(query))

  const url = "https://metaphysics-staging.artsy.net/v2"
  const body = JSON.stringify({ query, variables })
  const options = {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body,
  }

  const response = await fetch(url, options)
  const json = await response.json()
  VERBOSE && console.log(JSON.stringify(json, null, 2))
  return json
}

export function writeOutput(content: string) {
  const time = Date.now()
  const timeStamp = new Date(time).toISOString()

  const outputPath = path.join(__dirname, "output", `${input}-${timeStamp}.csv`)

  fs.appendFile(outputPath, `${content}`, (err) => {
    if (err) {
      console.error("Error:", err)
    }
  })
}

main()
