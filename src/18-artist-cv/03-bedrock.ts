import { generateText } from "ai"
import { bedrock } from "@ai-sdk/amazon-bedrock"
import dotenv from "dotenv"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"
import dedent from "dedent"

dotenv.config()

const SCHEMA = JSON.stringify(
  zodToJsonSchema(
    z.object({
      description: z.string().describe("Description of the image"),
    })
  ),
  null,
  2
)

async function main() {
  const response = await generateText({
    model: bedrock("us.meta.llama3-2-90b-instruct-v1:0"),
    maxTokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: dedent`
            Your task is to describe the image you are provided.

            Your response should be a valid JSON object, conforming to the following schema:

            \`\`\`json
            ${SCHEMA}
            \`\`\`
            `,
          },
          {
            type: "image",
            image:
              "https://live.staticflickr.com/3670/11278910216_ff8a1340df_c_d.jpg",
          },
        ],
      },
    ],
  })

  console.log(response.text)
}

main()
