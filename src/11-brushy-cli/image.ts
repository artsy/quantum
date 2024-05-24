/* eslint-disable @typescript-eslint/no-explicit-any */

import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"
import dedent from "dedent"

const PROMPT = dedent`
Describe the supplied artwork in 150 words or less.

Consider visual qualities, colors, medium as well as
any associated artistic styles or movements
`

export async function getImageDescription(
  model: { modelId: string },
  artwork: any
) {
  let imageDescription: string
  if (model.modelId.match(/claude/)) {
    imageDescription = (await getImageDescriptionAnthropic(artwork)) || "n/a"
  } else {
    imageDescription = (await getImageDescriptionOpenAI(artwork)) || "n/a"
  }
  return imageDescription
}

export async function getImageDescriptionAnthropic(artwork: any) {
  const anthropic = new Anthropic()

  const imageMediaType = "image/jpeg"
  const imageArrayBuffer = await (
    await fetch(artwork.image.resized.url)
  ).arrayBuffer()

  const imageData = Buffer.from(imageArrayBuffer).toString("base64")

  const response = await anthropic.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: PROMPT,
          },
          {
            type: "text",
            text: dedent`
            Here are some further details about the artwork:

            - Medium: ${artwork.medium?.name}
            - Materials: ${artwork.materials}
            `,
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: imageMediaType,
              data: imageData,
            },
          },
        ],
      },
    ],
  })
  return response.content[0].text
}

export async function getImageDescriptionOpenAI(artwork: any) {
  const openai = new OpenAI()
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    stream: false,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          {
            type: "text",
            text: dedent`
            Here are some further details about the artwork:

            - Medium: ${artwork.medium?.name}
            - Materials: ${artwork.materials}
            `,
          },
          {
            type: "image_url",
            image_url: {
              url: artwork.image.resized.url,
            },
          },
        ],
      },
    ],
  })
  return response.choices[0].message.content
}
