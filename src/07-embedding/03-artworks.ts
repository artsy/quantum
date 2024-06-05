import { ARTWORK_IDS } from "./artwork-ids"
import weaviate from "weaviate-ts-client"
import _ from "lodash"
import dotenv from "dotenv"
import { deleteIfExists } from "system/weaviate"

dotenv.config()

const client = weaviate.client({
  host: process.env.WEAVIATE_URL!,
})

const CLASS_NAME: string = "SmallNewTrendingArtworks"

const BATCH_SIZE = 100

async function main() {
  const artworks = await fetchArtworks()

  console.log(`Fetched ${artworks.length} artworks`)
  console.log(artworks)
  await prepareArtworksCollection()
  await insertArtworks(artworks)
  /*
   * now query from Weaviate console:
   * https://console.weaviate.io
   */
}

main()

async function prepareArtworksCollection() {
  const client = weaviate.client({
    host: process.env.WEAVIATE_URL!,
  })

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
      "generative-openai": {
        model: "gpt-3.5-turbo",
      },
    },
    properties: [
      {
        name: "rarity",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "medium",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "saleMessage",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "colors",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "slug",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "url",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "artistName",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "artistBirthday",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "artistGender",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "artistNationality",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "title",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
    ],
  }

  const classResult = await client.schema
    .classCreator()
    .withClass(classWithProps)
    .do()

  console.log(JSON.stringify(classResult, null, 2))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertArtworks(artworks: any[]) {
  console.log(`Going to insert ${artworks.length} artworks`)

  const batches = _.chunk(artworks, BATCH_SIZE)
  console.log(`Inserting ${batches.length} batches`)

  for (const artworkBatch of batches) {
    let batcher = client.batch.objectsBatcher()
    batcher = batcher.withObjects(
      ...artworkBatch.map((artwork) => ({
        class: CLASS_NAME,
        properties: artwork,
      }))
    )
    process.stdout.write(`${artworkBatch.length}`)
    await batcher.do()
  }
  process.stdout.write("\n")
}

async function fetchArtworks() {
  const query = `query getArtworks ($size: Int!, $ids: [String]!) {
    artworks(first: $size, ids: $ids) {
      edges {
        node {
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
          artist {
            name
            birthday
            gender
            nationality
          }
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
      return response.data.artworks.edges.map((edge: any) => {
        return {
          artistName: edge.node.artist.name,
          artistBirthday: edge.node.artist.birthday,
          artistGender: edge.node.artist.gender,
          artistNationality: edge.node.artist.nationality,
          colors: edge.node.dominantColors.join(", "),
          medium: edge.node.mediumType.name,
          rarity: edge.node.attributionClass.name,
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

async function metaphysics(args: {
  query: string
  variables: Record<string, unknown>
  headers: Record<string, string>
}) {
  const { query, variables, headers } = args

  const url = "https://metaphysics-staging.artsy.net/v2"

  const body = JSON.stringify({ query, variables })
  const options = { method: "POST", headers, body }

  const response = await fetch(url, options)
  const json = await response.json()
  return json
}
