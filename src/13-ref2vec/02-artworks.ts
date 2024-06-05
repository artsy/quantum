import { ARTWORK_IDS } from "./ids/artwork-ids"
import weaviate, { generateUuid5 } from "weaviate-ts-client"
import _ from "lodash"
import { Artwork } from "./types/types"
import { metaphysics } from "system/metaphysics"
import dotenv from "dotenv"
import { deleteIfExists } from "system/weaviate"

dotenv.config()

// Constants
const CLASS_NAME: string = "SmallNewTrendingArtworks"
const BATCH_SIZE: number = 100

const client = weaviate.client({
  host: process.env.WEAVIATE_URL!,
})

async function main() {
  const artworks = await fetchArtworks()

  console.log(`Fetched ${artworks.length} artworks`)

  await prepareCollection()
  await insertObjects(artworks, BATCH_SIZE)
}

main()

async function prepareCollection() {
  await deleteIfExists(CLASS_NAME)

  const classWithProps = {
    class: CLASS_NAME,
    vectorizer: "text2vec-openai",
    moduleConfig: {
      "text2vec-openai": {
        model: "text-embedding-3-small",
        dimensions: 1536,
        type: "text",
        vectorizeClassName: false,
      },
    },
    properties: [
      {
        name: "rarity",
        dataType: ["text"],
      },
      {
        name: "medium",
        dataType: ["text"],
      },
      {
        name: "saleMessage",
        dataType: ["text"],
      },
      {
        name: "colors",
        dataType: ["text"],
      },
      {
        name: "slug",
        dataType: ["text"],
      },
      {
        name: "url",
        dataType: ["text"],
      },
      {
        name: "title",
        dataType: ["text"],
      },
    ],
  }

  const classResult = await client.schema
    .classCreator()
    .withClass(classWithProps)
    .do()

  console.log(JSON.stringify(classResult, null, 2))
}

async function insertObjects(objects: Artwork[], batchSize: number) {
  console.log(`Inserting artwork: ${objects.length}`)

  const batches = _.chunk(objects, batchSize)
  console.log(`Inserting ${batches.length} batches`)

  for (const userBatch of batches) {
    let batcher = client.batch.objectsBatcher()
    batcher = batcher.withObjects(
      ...userBatch.map((artwork) => {
        return {
          class: CLASS_NAME,
          properties: _.omit(artwork, ["internalID"]),
          id: generateUuid5(artwork.internalID),
        }
      })
    )
    process.stdout.write(`${userBatch.length}`)
    await batcher.do()
  }
  process.stdout.write("\n")
}

async function fetchArtworks() {
  const query = `query getArtworks ($size: Int!, $ids: [String]!) {
    artworks(first: $size, ids: $ids) {
      edges {
        node {
          internalID
          attributionClass {
            name
          }
          mediumType {
            name
          }
          saleMessage
          dominantColors
          slug
          href
          title
        }
      }
    }
  }
  `

  const headers = {
    "Content-Type": "application/json",
  }

  const batches = _.chunk(ARTWORK_IDS, BATCH_SIZE)

  const artworks = await Promise.all(
    batches.map(async (ids) => {
      const variables = {
        size: ids.length,
        ids,
      }

      const response = await metaphysics({ query, variables, headers })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return response.artworks.edges.map((edge: any) => {
        return {
          internalID: edge.node.internalID,
          colors: edge.node.dominantColors.join(", "),
          medium: edge.node.mediumType.name,
          rarity: edge.node.attributionClass?.name || null,
          saleMessage: edge.node.saleMessage,
          slug: edge.node.slug,
          title: edge.node.title,
          url: `https://staging.artsy.net${edge.node.href}`,
        }
      })
    })
  )

  return artworks.flat()
}
