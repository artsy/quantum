import dotenv from "dotenv"
import chalk from "chalk"
import { CoreMessage, generateText, streamText, tool } from "ai"
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

  /*
   * Tool loop demo, kind of a baby agent
   */

  const messages: CoreMessage[] = [
    {
      role: "system",
      content: dedent`
        You are a terse math assistant. You use tools to answer the user's question
      `,
    },
    {
      role: "user",
      content: dedent`
        Which is greater, the average of the first 3 odd numbers, or the first 2 even numbers?
      `,
    },
  ]

  const MAX_ITERATIONS = 10
  let i = 0
  let isDone = false

  console.log(chalk.bold.red("\nTool loop agent"))

  // loop until done
  while (!isDone && i < MAX_ITERATIONS) {
    const response = await generateText({
      model: openai("gpt-4o"),
      temperature: 0,
      messages,
      tools: {
        addTwoNumbers,
        multiplyTwoNumbers,
        subtractTwoNumbers,
        divideTwoNumbers,
      },
    })

    switch (response.finishReason) {
      case "stop":
        // we have generated a response and are done, so respond and quit
        isDone = true
        console.log(chalk.bold.blue(`\nResponse text (iteration #${++i})`))
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
        console.log(chalk.bold.blue(`\nTool call (iteration #${++i})`))
        console.log(response.toolCalls)
        console.log(response.toolResults)
        break

      default:
        // there could be other reasons, but we ignore that for now
        throw new Error(`Unhandled finish reason: ${response.finishReason}`)
    }
  }
}

/*
 * Sample tool library
 */

const addTwoNumbers = tool({
  description: "Add two numbers",
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ a, b }) => Promise.resolve(a + b),
})

const multiplyTwoNumbers = tool({
  description: "Multiply two numbers",
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ a, b }) => Promise.resolve(a * b),
})

const subtractTwoNumbers = tool({
  description: "Subtract two numbers",
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ a, b }) => Promise.resolve(a - b),
})

const divideTwoNumbers = tool({
  description: "Divide two numbers",
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ a, b }) => Promise.resolve(a / b),
})

main()
