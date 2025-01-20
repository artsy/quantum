import { generateText } from "ai"
import { bedrock } from "@ai-sdk/amazon-bedrock"
import dotenv from "dotenv"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"
import dedent from "dedent"
import { getImageData } from "./image"
import fs from "fs"
import path from "path"

dotenv.config()

const SCHEMA = JSON.stringify(
  zodToJsonSchema(
    z
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
      .partial()
  ),
  null,
  2
)

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
            image: getImageData("examples/dancy-cv-1-smallerer.jpg"),
          },

          /**
           * Multiple image inference is not supported yet
           */

          // {
          //   type: "image",
          //   image: getImageData("examples/dancy-cv-2-smallerer.jpg"),
          // },
          // {
          //   type: "image",
          //   image: getImageData("examples/dancy-cv-3-smallerer.jpg"),
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
