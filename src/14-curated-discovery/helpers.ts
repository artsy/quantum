import { GravityArtwork } from "./types"
import path from "path"
import fs from "fs"
import _ from "lodash"

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
  return `https://d7hftxdivxxvm.cloudfront.net/?src=${src}&resize_to=fit&width=${width}&height=${height}&grow=false`
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
