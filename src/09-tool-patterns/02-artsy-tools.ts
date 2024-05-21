import dotenv from "dotenv"
import chalk from "chalk"
import { CoreMessage, generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import dedent from "dedent"
import { fetchUserArtistFollows } from "../lib/tools"

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
        What are some things that the artists I am following right now have in common?

        Be specific. Use 100 words or less.
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
        fetchUserArtistFollows,
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
