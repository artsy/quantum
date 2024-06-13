import weaviate, { generateUuid5 } from "weaviate-ts-client"
import _ from "lodash"
import { GravityArtist } from "./types"
import { deleteIfExists } from "system/weaviate"
import dotenv from "dotenv"
import { getArtists } from "./helpers"

dotenv.config()

const CLASS_NAME = "DiscoveryArtists"
const BATCH_SIZE = 100

const client = weaviate.client({
  host: process.env.WEAVIATE_URL!,
})

async function main() {
  await deleteIfExists(CLASS_NAME)
  await prepareArtistCollection()
  const artists = await getArtists()
  await insertArtists(artists)
}

/**
 * Create and configure a new collection to hold artists
 */
async function prepareArtistCollection() {
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
        name: "internalID",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
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
      {
        name: "name",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "nationality",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "birthday",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "deathday",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "location",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "hometown",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "gender",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "categories",
        dataType: ["text[]"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "blurb",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
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

/**
 * Insert artists into Weaviate
 *
 * Also assigns a deterministic UUID to each artist,
 * based on its Gravity ID
 */
async function insertArtists(
  artists: GravityArtist[],
  batchSize: number = BATCH_SIZE
) {
  console.log(`Inserting artist: ${artists.length}`)

  const batches = _.chunk(artists, batchSize)
  console.log(`Inserting ${batches.length} batches`)

  for (const artistBatch of batches) {
    let batcher = client.batch.objectsBatcher()
    batcher = batcher.withObjects(
      ...artistBatch.map((artist) => {
        return {
          class: CLASS_NAME,
          properties: {
            internalID: artist.id,
            slug: artist.slug,
            name: artist.name,
            nationality: artist.nationality,
            birthday: artist.birthday,
            deathday: artist.deathday,
            location: artist.location,
            hometown: artist.hometown,
            gender: artist.gender,
            categories: artist.categories,
            blurb: artist.blurb,
          },
          id: generateUuid5(artist.id),
        }
      })
    )
    process.stdout.write(".")
    await batcher.do()
  }
  process.stdout.write("\n")
}

main().catch(console.error)
