import { ARTIST_IDS } from "./artist-ids"
import weaviate from "weaviate-ts-client"
import _ from "lodash"
import dotenv from "dotenv"
import { deleteIfExists } from "system/weaviate"

dotenv.config()

const client = weaviate.client({
  host: process.env.WEAVIATE_URL!,
})

const CLASS_NAME: string = "ArtistBio2"

const BATCH_SIZE = 100

async function main() {
  const artists = await fetchArtists()
  await prepareArtistsCollection()
  await insertArtists(artists)
  /*
   * now query from Weaviate console:
   * https://link.weaviate.io/3UEZ854
   */
}

main()

async function prepareArtistsCollection() {
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
        name: "blurb",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: false,
          },
        },
      },
      {
        name: "slug",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
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

async function insertArtists(artists: { slug: string; blurb: string }[]) {
  console.log(`Going to insert ${artists.length} artists`)

  const batches = _.chunk(artists, BATCH_SIZE)
  console.log(`Inserting ${batches.length} batches`)

  for (const artistBatch of batches) {
    let batcher = client.batch.objectsBatcher()
    batcher = batcher.withObjects(
      ...artistBatch.map((artist) => ({
        class: CLASS_NAME,
        properties: artist,
      }))
    )
    process.stdout.write(".")
    await batcher.do()
  }
  process.stdout.write("\n")
}

async function fetchArtists() {
  const query = `query getArtists ($size: Int!, $ids: [String]!) {
    artistsConnection(first: $size, ids: $ids) {
      edges {
        node {
          slug
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
      return response.data.artistsConnection.edges.map((edge: any) => edge.node)
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
