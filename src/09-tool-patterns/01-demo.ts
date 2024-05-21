import dotenv from "dotenv"
import chalk from "chalk"
import { generateText, streamText, tool } from "ai"
import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import dedent from "dedent"
import { z } from "zod"

dotenv.config()

async function main() {
  const system = dedent`
    You are terse assistant, who responds in 100 words or less.
  `

  let prompt = dedent`
    Who's that artist who makes those rooms full of mirrors?
  `

  /*
   * Simplest demo
   */

  let response = await generateText({
    model: openai("gpt-4o"),
    temperature: 0,
    system,
    prompt,
  })

  console.log(chalk.bold.red("\nSimple demo"))
  console.log(chalk.bold.blue("\nPrompt"))
  console.log(prompt)
  console.log(chalk.bold.blue("\nResponse text"))
  console.log(response.text)

  /*
   * Switch LLM providers in one LOC
   */

  response = await generateText({
    model: anthropic("claude-3-haiku-20240307"), // <<-- that's it
    temperature: 0,
    system,
    prompt,
  })

  console.log(chalk.bold.red("\nSwitching provider to Anthropic"))
  console.log(chalk.bold.blue("\nPrompt"))
  console.log(prompt)
  console.log(chalk.bold.blue("\nResponse text"))
  console.log(response.text)

  /*
   * Uniform streaming API for all LLM providers
   */

  const streamedResponse = await streamText({
    model: anthropic("claude-3-haiku-20240307"),
    temperature: 0,
    system,
    prompt,
  })

  console.log(chalk.bold.red("\nStreaming response"))
  console.log(chalk.bold.blue("\nPrompt"))
  console.log(prompt)
  console.log(chalk.bold.blue("\nResponse text"))

  for await (const chunk of streamedResponse.textStream) {
    process.stdout.write(chunk)
  }
  process.stdout.write("\n")

  /*
   * Simple tool demo
   */

  prompt = "What's 42 + 42?"

  const toolResponse = await generateText({
    model: openai("gpt-4o"),
    temperature: 0,
    prompt,
    tools: {
      addTwoNumbers,
    },
  })

  console.log(chalk.bold.red("\nSimple tool call"))
  console.log(chalk.bold.blue("\nPrompt"))
  console.log(prompt)
  console.log(chalk.bold.blue("\nResponse text"))
  console.log(toolResponse.toolCalls)
  console.log(toolResponse.toolResults)
}

/*
 * Sample tool
 */

const addTwoNumbers = tool({
  description: "Add two numbers",
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ a, b }) => Promise.resolve(a + b),
})

main()
