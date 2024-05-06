import { fetchArticles } from "./lib/fetchArticles"
import { transformArticle } from "./lib/transformArticle"
import { writeTransformedArticle } from "./lib/writeTransformedArticle"

async function main() {
  const articles = await fetchArticles(100)
  const transformedArticles = articles.map(transformArticle)
  transformedArticles.forEach(writeTransformedArticle)
}

main()
