import _ from "lodash"
import { TransformedArticle } from "../extract/transformArticle"
import weaviate from "weaviate-ts-client"
import { CLASS_NAME } from "../../02-insert-articles"

const BATCH_SIZE = 20

/**
 * Insert articles into Weaviate using the batch insertion API
 */
export async function insertArticles(articles: TransformedArticle[]) {
  const client = weaviate.client({
    scheme: "https",
    host: "https://weaviate.stg.artsy.systems",
  })

  console.log(`Going to insert ${articles.length} articles`)

  const batches = _.chunk(articles, BATCH_SIZE)
  console.log(`Inserting ${batches.length} batches`)

  for (const articleBatch of batches) {
    let batcher = client.batch.objectsBatcher()
    batcher = batcher.withObjects(
      ...articleBatch.map((article) => ({
        class: CLASS_NAME,
        properties: propertiesFromArticle(article),
      }))
    )
    process.stdout.write(".")
    await batcher.do()
  }
  process.stdout.write("\n")
}

function propertiesFromArticle(article: TransformedArticle) {
  return {
    // metadata, not vectorized
    internalID: article.metadata.internalID,
    title: article.metadata.title,
    href: article.metadata.href,
    publishedAt: article.metadata.publishedAt,
    byline: article.metadata.byline,
    vertical: article.metadata.vertical,
    channelName: article.metadata.channelName,

    // content, maybe vectorized
    head: article.head,
    body: article.body,
  }
}
