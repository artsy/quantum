import fs from "fs"
import path from "path"
import { flatten } from "lodash"

export function getImagesContent(imagePaths: string[]) {
  const data = imagePaths.map((imagePath: string, i: number) => {
    return [
      {
        type: "text",
        text: `Image ${i + 1}:`,
      },
      {
        ...getImageContent(imagePath),
      },
    ]
  })

  return flatten(data)
}

export function getImageContent(imagePath: string) {
  return {
    type: "image",
    image: getImageData(imagePath),
  }
}

export function getImageData(imagePath: string) {
  const imagePathResolved = path.resolve(__dirname, imagePath)
  const imageArrayBuffer = fs.readFileSync(imagePathResolved)
  const imageData = Buffer.from(imageArrayBuffer).toString("base64")

  return imageData
}
