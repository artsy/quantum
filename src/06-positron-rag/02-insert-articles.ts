import { listArticles } from "./lib/insert/listArticles"
import { prepareArticlesCollection } from "./lib/insert/prepareArticlesCollection"
import { insertArticles } from "./lib/insert/insertArticles"

export const CLASS_NAME: string = "ArticleV1"

async function main() {
  const articles = listArticles()
  await prepareArticlesCollection()
  insertArticles(articles)
}

main()
