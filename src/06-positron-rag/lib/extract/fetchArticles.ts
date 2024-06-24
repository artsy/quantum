/* eslint-disable @typescript-eslint/no-explicit-any */

export async function fetchArticles(
  minArticleCount: number = 10,
  batchSize: number = 10,
  sleepMs: number = 1000
) {
  const url = "https://metaphysics-staging.artsy.net/v2"
  let afterCursor = ""
  let articles: any[] = []

  while (articles.length < minArticleCount) {
    const query = `
    {
      articlesConnection(first: ${batchSize}, after: "${afterCursor}", sort: PUBLISHED_AT_DESC) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          cursor
          node {
            # meta
            internalID
            title
            searchTitle # unused?
            href
            publishedAt
            thumbnailImage {
              imageURL
            }

            # creators
            byline
            authors {
              name
            }

            # summary
            description
            keywords
            leadParagraph # unused?

            # buckets
            channel  {
              internalID
              slug
              name
              type
            }
            vertical
            seriesArticle {
              href
            }

            # content
            sections {
              __typename
              ... on ArticleSectionText {
                body
              }
            }
          }
        }
      }
    }
    `

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })

      process.stdout.write(".")

      const data: any = await response.json()
      articles = articles.concat(
        data.data.articlesConnection.edges.map((edge: any) => edge.node)
      )

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve()
        }, sleepMs)
      })

      afterCursor = data.data.articlesConnection.pageInfo.endCursor

      if (!data.data.articlesConnection.pageInfo.hasNextPage) {
        break
      }
    } catch (error) {
      console.error("Error: ", error)
    }
  }

  process.stdout.write("\n")
  return articles
}
