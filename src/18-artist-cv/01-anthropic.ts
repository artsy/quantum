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
import dedent from "dedent"
import { current } from "./examples"

dotenv.config()

const IMAGE_PATHS = [
  current.images.regular[0],
  // current.images.regular[1],
  // current.images.regular[2], // adding more images may cause fewer tokens in the response 🤔
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
    temperature: 0,
    max_tokens: 1024,
    tools: [
      {
        name: "artistCV",
        description:
          "Extract an artist's curriculum vitae using well-structured JSON.",
        input_schema: {
          type: "object",
          properties: {
            artistName: {
              type: "string",
              description: "Artist's name",
            },
            education: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  year: {
                    type: "integer",
                    description: "Year of completion",
                  },
                  degree: {
                    type: "string",
                    description: "Degree",
                  },
                  institution: {
                    type: "string",
                    description: "Name of the institution",
                  },
                  location: {
                    type: "string",
                    description: "Location of the institution",
                  },
                },
              },
            },
            exhibitions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  year: {
                    type: "integer",
                    description: "Year of exhibition",
                  },
                  title: {
                    type: "string",
                    description: "Title of the exhibition",
                  },
                  exhibitionType: {
                    type: "string",
                    enum: ["solo", "group", "unknown"],
                    description: "Type of exhibition (solo or group show)",
                  },
                  venue: {
                    type: "string",
                    description:
                      "Name of the exhibition venue (gallery, museum, etc)",
                  },
                  location: {
                    type: "string",
                    description: "Location of the venue",
                  },
                },
                required: ["year", "title", "exhibitionType", "venue"],
              },
            },
          },
          required: ["artistName", "exhibitions"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "artistCV" },
    system: dedent`
      You are a reader of artists' curriculum vitae, or CVs.

      The CV is a document that lists an artist's exhibition history, as well as possibly their education, awards, residencies, publications and other achievements.

      You will be provided with images which constitute such a CV.

      Your task is to extract structured data from this CV using the provided tool and json schema.

      It is important that you extract as much information as possible from the CV. Extract ALL exhibitions, not just a subset.

      A single CV may be broken up into multiple image files. Examine all of them before you produce a response.

      The layout of the CV may include multiple exhibitions for each year heading. Be sure to extract all of them.
    `,
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
  .then((response) =>
    console.log(JSON.stringify(response.content[0].input, null, 2))
  )
