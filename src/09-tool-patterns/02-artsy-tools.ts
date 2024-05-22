/**
 * Demonstrates tool usage of the Vercel AI SDK, with some
 * proposed patterns for Artsy-specific tools
 *
 * Requires having a USER_ID and USER_ACCESS_TOKEN provided via env
 * so that it can generate a response based on user data
 *
 * yarn tsx src/09-tool-patterns/02-artsy-tools.ts
 *
 */
import dotenv from "dotenv"
import chalk from "chalk"
import { CoreMessage, generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import dedent from "dedent"
import { fetchUser } from "@/tools/fetchUser"
import { fetchUserArtistFollows } from "@/tools/fetchUserArtistFollows"
import { fetchShowsNearLocation } from "@/tools/fetchShowsNearLocation"

dotenv.config()

const MAX_ITERATIONS = 10

async function main() {
  const messages: CoreMessage[] = [
    {
      role: "system",
      content: dedent`
        You are a terse assistant who uses Artsy data to answer user questions about the art world.

        You make use of tools to query Artsy for data about users, artists and artworks.
      `,
    },
    {
      role: "user",
      content: dedent`
        Are there any shows near me with artists that I follow?
      `,
    },
  ]

  let currentIteration = 0
  let isDone = false

  while (!isDone && currentIteration < MAX_ITERATIONS) {
    const response = await generateText({
      model: openai("gpt-4o"),
      temperature: 0,
      messages,
      tools: {
        fetchUser,
        fetchUserArtistFollows,
        fetchShowsNearLocation,
      },
    })

    switch (response.finishReason) {
      case "stop":
        // we have generated a response and are done, so respond and quit
        isDone = true
        console.log(
          chalk.bold.blue(`\nResponse text (iteration #${++currentIteration})`)
        )
        console.log(chalk.bold.green(response.text))
        console.log(chalk.bold.blue.dim(`\nIn response to original prompt:`))
        console.log(chalk.dim(messages[1].content))
        break

      case "tool-calls":
        // we have called tools, so add the tool calls & results to the message list
        messages.push(
          {
            role: "assistant",
            content: response.toolCalls,
          },
          {
            role: "tool",
            content: response.toolResults,
          }
        )
        console.log(
          chalk.bold.blue(`\nTool call (iteration #${++currentIteration})`)
        )
        console.log(response.toolCalls)
        console.log(response.toolResults)
        console.log(
          chalk.dim(JSON.stringify(response.toolResults.map((tr) => tr.result)))
        )
        break

      default:
        // there could be other reasons, but we ignore that for now
        throw new Error(`Unhandled finish reason: ${response.finishReason}`)
    }
  }
}

main()
