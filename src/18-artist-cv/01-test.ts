/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Use a multimodal model to extract info from artist CV
 */

import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import Anthropic from "@anthropic-ai/sdk"
import { flatten } from "lodash"
import { ContentBlockParam } from "@anthropic-ai/sdk/resources"

dotenv.config()

const IMAGE_PATHS = [
  "examples/dancy-cv-1-smaller.jpg",
  "examples/dancy-cv-2-smaller.jpg",
  "examples/dancy-cv-3-smaller.jpg",
]

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
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: imageData,
        },
      },
    ]
  })

  return flatten(data)
}

const imagesContent = getImagesContent(IMAGE_PATHS)

const anthropic = new Anthropic()

anthropic.messages
  .create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    tools: [
      {
        name: "record_summary",
        description: "Record summary of an image using well-structured JSON.",
        input_schema: {
          type: "object",
          properties: {
            key_colors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  r: { type: "number", description: "red value [0.0, 1.0]" },
                  g: { type: "number", description: "green value [0.0, 1.0]" },
                  b: { type: "number", description: "blue value [0.0, 1.0]" },
                  name: {
                    type: "string",
                    description:
                      'Human-readable color name in snake_case, e.g. "olive_green" or "turquoise"',
                  },
                },
                required: ["r", "g", "b", "name"],
              },
              description: "Key colors in the image. Limit to less then four.",
            },
            description: {
              type: "string",
              description: "Image description. One to two sentences max.",
            },
            estimated_year: {
              type: "integer",
              description:
                "Estimated year that the images was taken, if is it a photo. Only set this if the image appears to be non-fictional. Rough estimates are okay!",
            },
          },
          required: ["key_colors", "description"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "record_summary" },
    messages: [
      {
        role: "user",
        content: [
          ...(imagesContent as ContentBlockParam[]),
          { type: "text", text: "Describe these images" },
        ],
      },
    ],
  })
  .then((response) => console.log(JSON.stringify(response, null, 2)))
