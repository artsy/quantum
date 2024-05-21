import chalk from "chalk"
import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import { generateText, streamText } from "ai"
import { config } from "dotenv"
import dedent from "dedent"

config()

async function main() {
  const system = dedent`
    You are terse assistant, who responds in 100 words or less.
  `

  const prompt = dedent`
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
}

main()
