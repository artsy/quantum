import { generateText } from "ai"
import { bedrock } from "@ai-sdk/amazon-bedrock"
import dotenv from "dotenv"
import { zodToJsonSchema } from "zod-to-json-schema"
import dedent from "dedent"
import { getImageData } from "./image"
import fs from "fs"
import path from "path"
import { schema } from "./schema"
import { current } from "./examples"

dotenv.config()

const SCHEMA = JSON.stringify(zodToJsonSchema(schema), null, 2)

async function main() {
  const response = await generateText({
    model: bedrock("us.meta.llama3-2-90b-instruct-v1:0"),
    temperature: 0.1,
    maxTokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: dedent`
            Extract all information from the artist CV in the image.

            Be concise, and return ONLY a valid json object as the output, without any extra markdown or text.

            Follow the schema below for the json object:

            ${SCHEMA}
            `,
          },
          {
            type: "image",
            image: getImageData(current.images.smaller[0]),
          },

          /**
           * Multiple image inference is not supported yet
           */

          // {
          //   type: "image",
          // image: getImageData(current.images.smaller[1]),
          // },
          // {
          //   type: "image",
          // image: getImageData(current.images.smaller[2]),
          // },
        ],
      },
    ],
  })

  console.log(response.text)

  const fileName = `output/bedrock-llama-response.json`
  const fullPath = path.resolve(__dirname, fileName)
  fs.writeFileSync(fullPath, response.text)
}

main()
