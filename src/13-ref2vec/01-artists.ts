import { ARTIST_IDS } from "./ids/artist-ids"
import weaviate, { generateUuid5 } from "weaviate-ts-client"
import _ from "lodash"
import { Artist } from "./types/types"

// Constants
const CLASS_NAME: string = "SmallNewTrendingArtists"
const BATCH_SIZE: number = 100

const client = weaviate.client({
  scheme: "https",
  host: "https://weaviate.stg.artsy.systems",
})

async function main() {
  const artists = await fetchArtists()

  console.log(`Fetched ${artists.length} artists`)
  console.log(artists)
  await prepareCollection()
  await insertObjects(artists, BATCH_SIZE)
}

main()

async function prepareCollection() {
  const client = weaviate.client({
    scheme: "https",
    host: "https://weaviate.stg.artsy.systems",
  })

  const alreadyExists = await client.schema.exists(CLASS_NAME)

  if (alreadyExists) {
    console.log(`${CLASS_NAME} class already exists, deleting it`)
    await client.schema.classDeleter().withClassName(CLASS_NAME).do()
  }

  const classWithProps = {
    class: CLASS_NAME,
    moduleConfig: {
      "text2vec-openai": {
        model: "text-embedding-3-small",
        dimensions: 1536,
        type: "text",
        vectorizeClassName: false,
      },
    },
    vectorizer: "text2vec-openai",
    properties: [
      {
        name: "name",
        dataType: ["text"],
      },
      {
        name: "birthday",
        dataType: ["text"],
      },
      {
        name: "gender",
        dataType: ["text"],
      },
      {
        name: "nationality",
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

async function insertObjects(objects: Artist[], batchSize: number) {
  console.log(`Inserting artworks: ${objects.length}`)

  const batches = _.chunk(objects, batchSize)
  console.log(`Inserting ${batches.length} batches`)

  for (const batch of batches) {
    let batcher = client.batch.objectsBatcher()
    batcher = batcher.withObjects(
      ...batch.map((artist) => {
        return {
          class: CLASS_NAME,
          properties: _.omit(artist, ["id"]),
          id: generateUuid5(artist.id),
        }
      })
    )
    process.stdout.write(`${batch.length}`)
    await batcher.do()
  }
  process.stdout.write("\n")
}

async function fetchArtists() {
  const query = `query getArtists ($size: Int!, $ids: [String]!) {
    artistsConnection(first: $size, ids: $ids) {
      edges {
        node {
          internalID
          birthday
          gender
          nationality
          name
          blurb
          smallGalleries: filterArtworksConnection(
            marketingCollectionID: "b25bd137-d978-4101-bbb1-1ab67c188f3a", first: 10
          ) {
            edges {
              node {
                internalID
              }
            }
          }
          new: filterArtworksConnection(
            marketingCollectionID: "26923cfe-ca0c-44e0-a9cf-aec5cb1349c6", first: 10
          ) {
            edges {
              node {
                internalID
              }
            }
          }
          trending: filterArtworksConnection(
            marketingCollectionID: "d78e9a17-ccf6-4104-b4e9-95c18f6412df", first: 10
          ) {
            edges {
              node {
                internalID
              }
            }
          }
        }
      }
    }
  }
  `

  const headers = {
    "Content-Type": "application/json",
  }

  const batches = _.chunk(ARTIST_IDS, BATCH_SIZE)

  const artists = await Promise.all(
    batches.map(async (ids) => {
      const variables = {
        size: ids.length,
        ids,
      }

      const response = await metaphysics({ query, variables, headers })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return response.data.artistsConnection.edges.map((edge: any) => {
        return {
          id: edge.node.internalID,
          birthday: edge.node.birthday,
          gender: edge.node.gender,
          nationality: edge.node.nationality,
          name: edge.node.name,
          blurb: edge.node.blurb,
          artworks: [
            ...(edge.node.smallGalleries?.edges?.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (edge: any) => edge.node.internalID
            ) ?? []),
            ...(edge.node.new?.edges?.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (edge: any) => edge.node.internalID
            ) ?? []),
            ...(edge.node.trending?.edges?.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (edge: any) => edge.node.internalID
            ) ?? []),
          ],
        }
      })
    })
  )

  return artists.flat()
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
