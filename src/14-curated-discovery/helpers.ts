import { GravityArtwork } from "./types"
import path from "path"
import fs from "fs"
import _ from "lodash"
import { CoreMessage, generateObject } from "ai"
import { z } from "zod"
import dedent from "dedent"

/**
 * Read artworks from a local JSON file
 *
 * The JSON file will be gitignored, but the data can
 * be obtained from a shared folder, currently at:
 *
 * https://drive.google.com/drive/u/1/folders/1Lh7msUc0R_JlpNEzApZ4YbqB8x5tbpws
 */
export async function getArtworks() {
  const filePath = path.join(__dirname, "./data/artworks.json")
  const data = await fs.promises.readFile(filePath, "utf-8")
  const artworks: GravityArtwork[] = JSON.parse(data)
  return artworks
}

/**
 * Read an image over the network and convert it to a base64 string
 *
 * @param imageUrl URL of the image to read
 * @returns Base64 encoded image data
 */
export async function getBase64Blob(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl)
  const buffer = await response.arrayBuffer()
  return Buffer.from(buffer).toString("base64")
}

/**
 * Generate an url for a resized, cached version of an image.
 *
 * Makes use of Gemini's crop endpoint (media.artsy.net/crop) to
 * resize the image to fit the desired width and height.
 *
 * The actual request is issued to the Cloudfront distribution,
 * so that the resized image is cached and served from the CDN.
 *
 * @param src URL of the original image
 * @param options.width (optional) desired width of the resized image, defaults to 512
 * @param options.height (optional) desired height of the resized image, defaults to 512
 * @returns
 */
export function resizeImage(
  src: string,
  options?: {
    width: number
    height: number
  }
) {
  const { width, height } = _.defaults(options, { width: 512, height: 512 })
  return `https://d7hftxdivxxvm.cloudfront.net/?src=${src}&resize_to=fit&width=${width}&height=${height}&convert_to=jpg&grow=false`
}

/**
 * Return a mapping of artwork ids to their respective image contents
 * as Base64-encoded strings.
 *
 * @param artworkBatch - an array of artwork objects
 * @returns a dictionary of artwork IDs and their Base64 encoded images
 */
export async function getImageDataForArtworks(
  artworks: GravityArtwork[]
): Promise<{ [key: string]: string }> {
  const imageFieldPairs = await Promise.all(
    artworks.map(async (artwork) => {
      const resizedImageUrl = resizeImage(artwork.image_url)
      const image = await getBase64Blob(resizedImageUrl)
      return [artwork.id, image]
    })
  )
  const imageData = _.fromPairs(imageFieldPairs)
  return imageData
}

/**
 * Use multimodal models’ computer vision capabilities to
 * describe an artwork image.
 *
 * @param args.url URL of the artwork image that is to be described
 * @param args.model Model to use, as defined by Vercel AI SDK
 * @param args.maxWords Maximum number of words for prose description of the image (default: 200)
 * @returns An object that describes the image
 */
export async function describeImage(args: {
  url: string
  model: Parameters<typeof generateObject>[0]["model"]
  maxWords?: number
}) {
  const { url, model } = args
  const maxWords = args.maxWords || 200

  const VALID_COLORS = [
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "brown",
    "gray",
    "pink",
  ]

  const system = dedent`
    You are an expert on art and your task is to provide detailed
    descriptions of artworks.

    Consider the visual qualities of the artwork, as well as
    the artwork's relation to art historical styles and movements.

    If you detect any objects in the image, include them in your output.

    If you detect any words in the image, include them in your output.

    Include up to 3 prominent colors in your output, excluding any background paper, canvas, or wall colors. The only valid colors are ${VALID_COLORS.join(", ")}.
  `

  const schema = z.object({
    description: z.string(),
    objects: z.string().array().optional(),
    words: z.string().array().optional(),
    colors: z.string().array().max(3),
  })

  const messages: CoreMessage[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: dedent`
            Analyze the artwork depicted in this image.

            Limit the description to ${maxWords} words or less.
          `,
        },
        {
          type: "image",
          image: await getBase64Blob(url),
        },
      ],
    },
  ]

  return await generateObject({
    model,
    temperature: 0,
    system,
    messages,
    schema,
  })
}
