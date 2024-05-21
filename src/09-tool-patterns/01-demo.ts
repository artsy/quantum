import chalk from "chalk"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
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

  const response = await generateText({
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
}

main()
