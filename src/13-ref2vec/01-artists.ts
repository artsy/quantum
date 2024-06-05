import { ARTIST_IDS } from "./ids/artist-ids"
import weaviate, { generateUuid5 } from "weaviate-ts-client"
import _ from "lodash"
import { Artist } from "./types/types"
import { metaphysics } from "system/metaphysics"
import dotenv from "dotenv"
import { deleteIfExists } from "system/weaviate"

dotenv.config()

// Constants
const CLASS_NAME: string = "SmallNewTrendingArtists"
const BATCH_SIZE: number = 100

const client = weaviate.client({
  host: process.env.WEAVIATE_URL!,
})

async function main() {
  const artists = await fetchArtists()

  console.log(`Fetched ${artists.length} artists`)

  await prepareCollection()
  await insertObjects(artists, BATCH_SIZE)
}

main()

async function prepareCollection() {
  const client = weaviate.client({
    host: process.env.WEAVIATE_URL!,
  })

  await deleteIfExists(CLASS_NAME)

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
          properties: _.omit(artist, ["internalID"]),
          id: generateUuid5(artist.internalID),
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
      return response.artistsConnection.edges.map((edge: { node: Artist }) => {
        return {
          internalID: edge.node.internalID,
          birthday: edge.node.birthday,
          gender: edge.node.gender,
          nationality: edge.node.nationality,
          name: edge.node.name,
          blurb: edge.node.blurb,
        }
      })
    })
  )

  return artists.flat()
}
