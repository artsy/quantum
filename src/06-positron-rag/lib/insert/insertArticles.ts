import weaviate from "weaviate-ts-client"
import _ from "lodash"
import { CLASS_NAME } from "06-positron-rag/02-insert-articles"
import { TransformedArticle } from "../extract/transformArticle"
import dotenv from "dotenv"

dotenv.config()

const BATCH_SIZE = 20

/**
 * Insert articles (section by section) into Weaviate using the batch insertion API
 */
export async function insertArticles(articles: TransformedArticle[]) {
  const client = weaviate.client({
    host: process.env.WEAVIATE_URL!,
  })

  const articleSections = articles
    .flatMap((article) => {
      return article.sections.map((section, s) => {
        if (section.length > 0) {
          return {
            class: CLASS_NAME,
            properties: propertiesFromArticleSection(article, section, s),
          }
        }
      })
    })
    .filter(Boolean)

  const batches = _.chunk(articleSections, BATCH_SIZE)

  console.log(
    `Going to insert ${articleSections.length} article-sections in ${batches.length} batches`
  )

  for (const sectionBatch of batches) {
    let batcher = client.batch.objectsBatcher()

    // @ts-expect-error gah
    batcher = batcher.withObjects(...sectionBatch)
    process.stdout.write(".")
    await batcher.do()
  }
  process.stdout.write("\n")
}

function propertiesFromArticleSection(
  article: TransformedArticle,
  section: string,
  sectionIndex: number
) {
  return {
    // metadata, not vectorized
    internalID: article.metadata.internalID,
    title: article.metadata.title,
    href: article.metadata.href,
    publishedAt: article.metadata.publishedAt,
    byline: article.metadata.byline,
    keywords: article.metadata.keywords,
    vertical: article.metadata.vertical,
    channelName: article.metadata.channelName,
    sectionIndex,

    // content, maybe vectorized
    articleDescription: article.metadata.description,
    section,
  }
}
