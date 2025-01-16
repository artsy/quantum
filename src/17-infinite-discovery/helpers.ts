import { GravityArtwork } from "./types"
import path from "path"
import fs from "fs"
import { fromPairs, defaults } from "lodash"

/**
 * Read artworks from a local JSON file
 *
 * The JSON file will be gitignored, but the data can
 * be obtained from a shared folder, currently at:
 *
 * https://drive.google.com/drive/u/1/folders/1Lh7msUc0R_JlpNEzApZ4YbqB8x5tbpws
 */
export async function getArtworks(filename: string) {
  const filePath = path.join(__dirname, `./data/${filename}`)
  const data = await fs.promises.readFile(filePath, "utf-8")
  const artworks: GravityArtwork[] = JSON.parse(data)
  return artworks
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
  const imageData = fromPairs(imageFieldPairs)
  return imageData
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
  const { width, height } = defaults(options, { width: 224, height: 224 })
  return `https://d7hftxdivxxvm.cloudfront.net/?src=${src}&resize_to=fit&width=${width}&height=${height}&grow=false&quality=75`
}

/**
 * Read an image over the network and convert it to a base64 string
 *
 * @param imageUrl URL of the image to read
 * @returns Base64 encoded image data
 */
export async function getBase64Blob(imageUrl: string): Promise<string | null> {
  const response = await fetch(imageUrl)
  const buffer = await response.arrayBuffer()
  return Buffer.from(buffer).toString("base64")
}
