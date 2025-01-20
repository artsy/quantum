import { generateObject, UserContent } from "ai"
/* eslint-disable @typescript-eslint/no-unused-vars */
import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import { bedrock } from "@ai-sdk/amazon-bedrock"
/* eslint-enable @typescript-eslint/no-unused-vars */
import dotenv from "dotenv"
import { z } from "zod"
import fs from "fs"
import path from "path"
import { flatten, pick } from "lodash"
import dedent from "dedent"

dotenv.config()

/**
 * PDF pages exported as jpgs from Preview.app
 *
 * Then resized to be no larger than 951x1268
 * (convert dancy-cv-1.jpg -resize "951x1268" dancy-cv-1-smaller.jpg)
 *
 * See: https://docs.anthropic.com/en/docs/build-with-claude/vision#evaluate-image-size
 *
 */
const IMAGE_PATHS = [
  "examples/dancy-cv-1-smaller.jpg",
  "examples/dancy-cv-2-smaller.jpg",
  // "examples/dancy-cv-3-smaller.jpg", // adding the 3rd image causes fewer tokens in the response 🤔
]

async function main() {
  const response = await generateObject({
    // model: anthropic("claude-3-opus-latest"),
    // model: openai("o1-2024-12-17"),
    // model: bedrock("meta.llama3-2-90b-instruct-v1:0"),
    model: bedrock("us.meta.llama3-2-90b-instruct-v1:0"),
    temperature: 0,
    maxTokens: 2048,
    schema: z
      .object({
        artistName: z.string().describe("Artist's name"),
        education: z.array(
          z
            .object({
              year: z.number().describe("Year of completion"),
              degree: z.string().describe("Degree attained"),
              institution: z.string().describe("Name of the institution"),
              location: z.string().describe("Location of the institution"),
            })
            .describe("A list of educational experiences and degrees")
            .partial()
        ),
        exhibitions: z.array(
          z
            .object({
              year: z.number().describe("Year of exhibition"),
              title: z.string().describe("Title of the exhibition"),
              exhibitionType: z
                .enum(["solo", "group", "unknown"])
                .describe("Type of exhibition (solo or group show)"),
              venue: z
                .string()
                .describe(
                  "Name of the exhibition venue (gallery, museum, etc)"
                ),
              location: z.string().describe("Location of the venue"),
            })
            .describe(
              "A list of exhibitions the artist has participated in, or else an empty array"
            )
            .partial()
        ),
      })
      .partial(),
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
    JSON.stringify(pick(response, "object", "usage", "finishReason"), null, 2)
  )
}

function getImagesContent(imagePaths: string[]) {
  const data = imagePaths.map((imgPath: string, i: number) => {
    const imagePath = path.resolve(__dirname, imgPath)
    const imageArrayBuffer = fs.readFileSync(imagePath)
    const imageData = Buffer.from(imageArrayBuffer).toString("base64")

    return [
      {
        type: "text",
        text: `Image ${i + 1}:`,
      },
      {
        type: "image",
        image: imageData,
      },
    ]
  })

  return flatten(data)
}

main()
