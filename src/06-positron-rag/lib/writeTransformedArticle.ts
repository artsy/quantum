import { getDateFromTimestamp } from "./getDateFromTimestamp"
import { TransformedArticle } from "./transformArticle"
import fs from "fs"
import path from "path"

export function writeTransformedArticle(article: TransformedArticle) {
  const date = getDateFromTimestamp(article.metadata.publishedAt)
  const slug = article.metadata.href.split("/").pop()
  const filename = [date, slug].join("-")
  const filepath = path.join(
    __dirname,
    "..",
    "output",
    `${filename ?? "unknown"}.json`
  )
  const content = JSON.stringify(article, null, 2)

  console.log(filename.slice(0, 100))

  fs.writeFile(filepath, content, (err) => {
    if (err) {
      console.error("Error:", err)
    }
  })
}
