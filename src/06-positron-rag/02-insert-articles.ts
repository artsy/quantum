import { listArticles } from "./lib/insert/listArticles"
import { prepareArticlesCollection } from "./lib/insert/prepareArticlesCollection"
import { insertArticles } from "./lib/insert/insertArticles"

export const CLASS_NAME: string = "ArticleSections"

async function main() {
  const articles = listArticles()
  await prepareArticlesCollection()
  await insertArticles(articles)
}

main()
