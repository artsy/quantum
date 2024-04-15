import dotenv from "dotenv"
import OpenAI from "openai"

dotenv.config()
const openai = new OpenAI() // uses `OPENAI_API_KEY` from .env

/*
 * Define the tools that the assistant can use:
 *
 * 1. get_artists: Get a list of artists on Artsy
 * 2. get_curated_artists: Get a list of curated artists on Artsy
 */

const tools: OpenAI.Beta.FunctionTool[] = [
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
   * Create an assistant with models, tools, and instructions
   */

  const assistant = await openai.beta.assistants.create({
    name: "Artsy Advisor",
    instructions:
      "You are an art advisor. Your job is to listen to your client and provide helpful recommendations of artworks and artists that they may like. You consider price range, medium, rarity, and other key attributes a client may want to consider when purchasing art. You ask clarifying questions where necessary to build an accurate profile on your client and provide more accurate recommendations.",
    model: "gpt-3.5-turbo",
    tools,
  })

  /*
   * Create a thread and send a message to the assistant
   */

  const thread = await openai.beta.threads.create()

  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content:
      "I'm looking to purchase some art. I like pop art and have a budget of $5,000.",
  })

  /*
   * Run the thread using the desired assistant and poll until it reaches a completed state.
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */

  let run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistant.id,
    instructions: "Respond like you work at artsy.net.",
  })

  /*
   * If the assistant wants to use a tool to help its response, then call the function (locally defined, further down) to get the result from Artsy's API
   */

  if (
    run.status === "requires_action" &&
    run.required_action?.type === "submit_tool_outputs"
  ) {
    console.log("Calling function")
    const name =
      run.required_action.submit_tool_outputs.tool_calls?.[0].function.name
    const args = JSON.parse(
      run.required_action.submit_tool_outputs.tool_calls?.[0].function
        .arguments || "null"
    )

    let artists

    if (name === "get_artists") {
      artists = await get_artists(args)
    }

    if (name === "get_curated_artists") {
      artists = await get_curated_artists(args)
    }

    if (artists) {
      await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
        tool_outputs: [
          {
            tool_call_id:
              run.required_action.submit_tool_outputs.tool_calls?.[0].id,
            output: JSON.stringify(artists, null, 2),
          },
        ],
      })
    }
  }

  /*
   * Poll the run until it reaches a completed state and print the messages
   */
  run = await openai.beta.threads.runs.poll(thread.id, run.id)

  if (run.status === "completed") {
    const messages = await openai.beta.threads.messages.list(run.thread_id)
    for (const message of messages.data.reverse()) {
      if (message.content[0].type === "text") {
        console.log(`${message.role} > ${message.content[0].text.value}`)
      }
    }
  } else {
    console.log(run.status)
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
