import { generateObject, LanguageModelV1, UserContent } from "ai"
/* eslint-disable @typescript-eslint/no-unused-vars */
import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import { bedrock } from "@ai-sdk/amazon-bedrock"
/* eslint-enable @typescript-eslint/no-unused-vars */
import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import dedent from "dedent"
import chalk from "chalk"
import { getImagesContent } from "./image"
import { schema } from "./schema"
import { current } from "./examples"

dotenv.config()

const IMAGE_PATHS = [
  current.images.regular[0],
  // current.images.regular[1],
  // current.images.regular[2], // adding more images may cause fewer tokens in the response 🤔
]

const MODELS = [
  // anthropic("claude-3-opus-20240229"),
  // anthropic("claude-3-5-sonnet-20241022"),
  openai("gpt-4o-2024-11-20"),
  // bedrock("us.meta.llama3-2-90b-instruct-v1:0"),
]

async function main() {
  console.log(
    chalk.green(`Starting: ${MODELS.map((m) => m.modelId).join(", ")} …`)
  )
  const allOutput = Promise.all(
    MODELS.map((model) => {
      getModelResponse(model).then(() => {
        console.log(chalk.green(`Received: ${model.modelId}`))
      })
    })
  )

  await allOutput
}

async function getModelResponse(model: LanguageModelV1) {
  const response = await generateObject({
    model,
    temperature: 0,
    maxTokens: 4096,
    schema,
    system: dedent`
      You are a reader of artists' curriculum vitae, or CVs.

      The CV is a document that lists an artist's exhibition history, as well as possibly their education, awards, residencies, publications and other achievements.

      You will be provided with images which constitute such a CV.

      Your task is to extract structured data from this CV using the provided json schema.
    `,
    messages: [
      {
        role: "user",
        content: [
          ...getImagesContent(IMAGE_PATHS),
          {
            type: "text",
            text: "Produce a single valid JSON object to describe the CV in this collection of images",
          },
        ] as UserContent,
      },
    ],
  })

  console.log(
    JSON.stringify({ model: model.modelId, usage: response.usage }, null, 2)
  )

  const fileName = `output/${model.modelId}-response.json`
  fs.writeFileSync(
    path.resolve(__dirname, fileName),
    JSON.stringify(response.object, null, 2)
  )

  return response.object
}

main()
