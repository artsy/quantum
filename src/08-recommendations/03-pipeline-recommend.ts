/*
 * This variation tries the same technique of feeding candidates to the LLM to have it
 * choose and justify recommendations, but it differs from the previous attempts in two ways:
 *
 * - it sources the artwork candidates from our actual recommendations pipeline via a tool call
 * - it provides fewer candidates
 *
 * Because this makes a real query to Metaphysics for artwork recommendations, it requires
 * a valid user ID and access token to be provided as env vars / in the .env file.
 */

import OpenAI from "openai"
import dotenv from "dotenv"
import chalk from "chalk"

dotenv.config()
const openai = new OpenAI()

const userID = process.env.RECOMMENDATIONS_USER_ID
const accessToken = process.env.RECOMMENDATIONS_USER_ACCESS_TOKEN

if (!userID || !accessToken) {
  throw new Error(
    "Please provide a RECOMMENDATIONS_USER_ID and corresponding RECOMMENDATIONS_USER_ACCESS_TOKEN in the .env file to run this experiment"
  )
}

// Settings

/** fetch this many candidates from each of the recommendation fields */
const NUM_CANDIDATES_PER_FIELD = 10

/** applies to the `artworksForUser` field */
const INCLUDE_BACKFILL = true

/** for detailed logging of traffic to/from LLM and MP */
const VERBOSE = false

// Prompts

const userDescription = `
  John P. Has a collection of Print and Photography including works by Nathaniel Mary Quinn and Ewa Juszkiewicz, with a preference for Limited Edition works.
`

const systemPrompt = `
  Your task is to recommend three artworks from a larger list of recommendation candidates. You should return the artworks that are most likely to match the user description. ONLY include artworks that are for sale. Prefer works that display a price.

  If you receive no candidates, say that you have no candidates artworks to choose from.

  Always make sure that the medium type matches the user's request.

  Always include a justification as to why you are recommending each artwork.

  Your output should include the artwork title, details as well as a one to two sentence description as to why this artwork matches the user's description.

  Each of your artwork recommendations should have the following format including the —————— separator. Use plaintext only, no Markdown:

  ——————————

  ARTWORK: "<artwork title>", <artwork date>

  - <artist name>, <artist nationality>, b. <artist birthday if present>
  - <rarity> <medium>, <materials>
  - slug: <slug>

  WHY? <justification>
`

let candidateArtworks: { slug: string }[] = []

// Main

async function main() {
  console.log(
    chalk.bold(
      `Fetching recommendations for user ${userID} and matching to the user description:\n`
    ),
    chalk.bold.blue(userDescription)
  )

  // initial message list

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: initialUserMessage },
  ]

  // first response

  const firstResponse = await getCompletion(messages)

  // second response, based on tool call

  if (isTool(firstResponse)) {
    messages.push(firstResponse.choices[0].message)

    const toolResult = await getToolResult(firstResponse)
    messages.push(toolResult)
  }

  const secondResponse: OpenAI.Chat.Completions.ChatCompletion | undefined =
    await getCompletion(messages)

  // final result

  if (secondResponse !== undefined) {
    const { content } = secondResponse.choices[0].message
    console.log(chalk.bold("\nFinal response"))
    console.log("\n", chalk.bold.blue(content))

    printStatistics(content)
  }
}

const initialUserMessage = `
  Recommend some artworks for this user:

  <userDescription>
    ${userDescription}
  </userDescription>
`

async function getCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
) {
  console.log(chalk.black("\nGetting completion from OpenAI"))
  VERBOSE && console.log(chalk.cyan.dim("\n> Input >\n"))
  VERBOSE && console.log(chalk.cyan.dim(JSON.stringify(messages, null, 2)))

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
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
  console.log(chalk.black("\nGetting tool result from Artsy"))

  const { tool_calls: toolCalls } = response.choices[0].message

  VERBOSE && console.log(chalk.cyan.dim("\n> Input >\n"))
  VERBOSE && console.log(chalk.cyan.dim(JSON.stringify(toolCalls, null, 2)))

  const firstToolCall = toolCalls![0]

  const { id } = firstToolCall
  const { name } = firstToolCall.function

  let result: unknown

  if (name === "getArtworkRecommendations") {
    result = await getArtworkRecommendations()
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

async function getArtworkRecommendations() {
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
    }

    fragment artwork on Artwork {
      slug
      title
      date
      artist {
        name
        gender
        nationality
        birthday
      }
      rarity: attributionClass {
        name
      }
      medium: mediumType {
        name
      }
      materials: medium
      price: saleMessage
      # dominantColors
      # href
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

  // hard to know which recommendation fields will be populated,
  // so for now just fetch them all and concatenate them
  const artworksToUse = [
    ...response.data.me.recommendedArtworks.edges,
    ...response.data.me.artworkRecommendations.edges,
    ...response.data.artworksForUser.edges,
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  candidateArtworks = artworksToUse.map(({ node }: any) => node)

  return candidateArtworks
}

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getArtworkRecommendations",
      description:
        "Get a list of artworks that Artsy has recommended for the user (based on existing recommendation pipelines)",
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

  console.log(chalk.black("\nQuerying Metaphysics"))
  VERBOSE && console.log(chalk.black.dim(JSON.stringify({ variables })))
  VERBOSE && console.log(chalk.black.dim(query))

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

function printStatistics(content: string | null) {
  const recommendedSlugs =
    content
      ?.split("\n")
      .filter((line) => line.includes("slug:"))
      .map((line) => line.split(":")[1].trim()) || []

  const candidateSlugs = candidateArtworks.map((artwork) => artwork.slug)

  const positions = recommendedSlugs.map((slug) => {
    return candidateSlugs.indexOf(slug)
  })

  const medianPosition = positions.reduce((a, b) => a + b, 0) / positions.length

  console.log(
    chalk.black.dim(
      `\nThese results were sourced from a list of ${candidateSlugs.length} candidates`,
      VERBOSE ? "\n" + candidateSlugs.join("\n").trim() + "\n" : "",
      "\nAnd appeared at positions:",
      positions.join(", "),
      `\nThe median position was ${medianPosition}`
    )
  )
}

main()
