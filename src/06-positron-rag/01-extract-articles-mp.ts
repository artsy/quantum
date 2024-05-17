import { fetchArticles } from "./lib/extract/fetchArticles"
import { transformArticle } from "./lib/extract/transformArticle"
import { writeTransformedArticle } from "./lib/extract/writeTransformedArticle"

async function main() {
  const articles = await fetchArticles(100)
  const transformedArticles = articles.map(transformArticle)
  transformedArticles.forEach(writeTransformedArticle)
}

main()
