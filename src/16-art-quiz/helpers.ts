import { GravityArtwork } from "./types"
import path from "path"
import fs from "fs"

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
