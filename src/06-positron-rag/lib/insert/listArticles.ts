import fs from "fs"
import path from "path"
import { TransformedArticle } from "../extract/transformArticle"

/**
 * Read the local "./output" directory and return a list of articles in json format
 */
export function listArticles(): TransformedArticle[] {
  const fileNames = fs.readdirSync(
    path.resolve(__dirname, "..", "..", "./output")
  )
  const jsonFileNames = fileNames.filter(
    (fileName) => path.extname(fileName) === ".json"
  )

  const articles = jsonFileNames.map((fileName) => {
    const filePath = path.resolve(__dirname, "..", "..", "./output", fileName)
    const fileContent = fs.readFileSync(filePath, "utf-8")
    const article = JSON.parse(fileContent)
    return article
  })

  return articles
}
