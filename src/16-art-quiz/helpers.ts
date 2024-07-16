import { GravityArtwork } from "./types"
import path from "path"
import fs from "fs"

/**
 * Read artworks from a local JSON file
 *
 * The JSON file will be gitignored, but the data can
 * be obtained from a shared folder, currently at:
 *
 * https://drive.google.com/drive/folders/13hwE6ysjeSuwa19_3Vx_BwR5rBcUs8fq?usp=drive_link
 */
export async function getArtworks() {
  const filePath = path.join(__dirname, "./data/artworks.json")
  const data = await fs.promises.readFile(filePath, "utf-8")
  const artworks: GravityArtwork[] = JSON.parse(data)
  return artworks
}
