/**
 * Demonstrates that tools defined via Vercel AI SDK and
 * can easily be called via the vendor's own API client and
 * need not be locked into the Vercel abstractions.
 *
 * yarn tsx src/09-tool-patterns/03-vanilla-tool-call.ts
 *
 */
import dotenv from "dotenv"
import OpenAI from "openai"
import dedent from "dedent"
import { zodToJsonSchema } from "zod-to-json-schema"
import { fetchShowsNearLocation } from "@/tools/fetchShowsNearLocation"

dotenv.config()
const openai = new OpenAI()

async function main() {
  // build initial message list

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: dedent`
        Give me 3 gallery shows happening in New York City"
      `,
    },
  ]

  console.log("Message:", messages)

  // define tools, by accessing the AI SDK tool's attributes
  // and shaping them for the vendor's API client

  const tools: OpenAI.Chat.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "fetchShowsNearLocation",
        description: fetchShowsNearLocation.description,
        parameters: zodToJsonSchema(fetchShowsNearLocation.parameters),
      },
    },
  ]

  // get response, via vendor's vanilla chat completion

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    tools,
    messages,
  })

  // handle the tool call

  const toolCall = response.choices[0].message.tool_calls![0]

  console.log("\nTool call:", toolCall.function)

  if (toolCall.function.name === "fetchShowsNearLocation") {
    const args = JSON.parse(toolCall.function.arguments)
    const result = await fetchShowsNearLocation.execute(args)

    console.log("\nTool result:", result)
    process.exit(0)
  }

  throw new Error(`Unexpected tool call: ${toolCall.function.name}`)
}

main()
