/*
 * Sample code from https://platform.openai.com/docs/api-reference/chat/create, lightly TS-ified
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires

import dotenv from "dotenv"
import OpenAI from "openai"

dotenv.config()
const openai = new OpenAI()

async function main() {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "user", content: "What's the weather like in Boston today?" },
  ]

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "get_current_weather",
        description: "Get the current weather in a given location",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "The city and state, e.g. San Francisco, CA",
            },
            unit: { type: "string", enum: ["celsius", "fahrenheit"] },
          },
          required: ["location"],
        },
      },
    },
  ]

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    tools,
    tool_choice: "auto",
  })

  console.log(response.choices[0])
}

main()
