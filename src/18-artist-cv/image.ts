import fs from "fs"
import path from "path"

export function getImageData(imagePath: string) {
  const imagePathResolved = path.resolve(__dirname, imagePath)
  const imageArrayBuffer = fs.readFileSync(imagePathResolved)
  const imageData = Buffer.from(imageArrayBuffer).toString("base64")

  return imageData
}
