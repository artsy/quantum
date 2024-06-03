import { ARTWORK_IDS } from "./artwork-ids"
import { ARTIST_IDS } from "./artist-ids"
import weaviate, { generateUuid5 } from "weaviate-ts-client"
import _ from "lodash"
import dotenv from "dotenv"
import { ClassName, Objects, ReferenceProperty, User } from "./types"

// Config
dotenv.config()

// Constants
const CLASS_NAME: ClassName = "Users"
const BATCH_SIZE: number = 10
const SAMPLE_SIZE: number = 3
const USERS: User[] = [{ id: process.env.USER_ID!, name: "Percy Cat" }]

const client = weaviate.client({
  scheme: "https",
  host: "https://weaviate.stg.artsy.systems",
})

async function main() {
  const sampleArtworkIds = _.shuffle(ARTWORK_IDS).slice(0, SAMPLE_SIZE)
  const sampleArtistIds = _.shuffle(ARTIST_IDS).slice(0, SAMPLE_SIZE)

  await prepareCollection(CLASS_NAME)
  await insertObjects(USERS, BATCH_SIZE)
  await createReferences(
    USERS,
    sampleArtworkIds,
    "SmallNewTrendingArtworks",
    "likedArtworks"
  )
  await createReferences(
    USERS,
    sampleArtistIds,
    "SmallNewTrendingArtists",
    "likedArtists"
  )
}

main()

async function prepareCollection(className: ClassName) {
  const client = weaviate.client({
    scheme: "https",
    host: "https://weaviate.stg.artsy.systems",
  })

  const alreadyExists = await client.schema.exists(className)

  if (alreadyExists) {
    console.log(`${className} class already exists, deleting it`)
    await client.schema.classDeleter().withClassName(className).do()
  }

  const classSchema = {
    class: className,
    moduleConfig: {
      "ref2vec-centroid": {
        referenceProperties: ["likedArtworks", "likedArtists"],
      },
    },
    vectorizer: "ref2vec-centroid",
    properties: [
      {
        name: "likedArtworks",
        dataType: ["SmallNewTrendingArtworks"],
        description: "Artworks liked by this user",
      },
      {
        name: "likedArtists",
        dataType: ["SmallNewTrendingArtists"],
        description: "Artworks liked by this user",
      },
    ],
  }

  const classResult = await client.schema
    .classCreator()
    .withClass(classSchema)
    .do()

  console.log(JSON.stringify(classResult, null, 2))
}

async function insertObjects(objects: User[], batchSize: number) {
  console.log(`Inserting users: ${objects.length}`)

  const batches = _.chunk(objects, batchSize)
  console.log(`Inserting ${batches.length} batches`)

  for (const userBatch of batches) {
    let batcher = client.batch.objectsBatcher()
    batcher = batcher.withObjects(
      ...userBatch.map((user) => {
        return {
          class: CLASS_NAME,
          properties: _.omit(user, ["id"]),
          id: generateUuid5(user.id),
        }
      })
    )
    process.stdout.write(`${userBatch.length}`)
    await batcher.do()
  }
  process.stdout.write("\n")
}

async function createReferences(
  objects: Objects,
  referenceIDs: string[],
  referenceClassName: ClassName,
  referenceProperty: ReferenceProperty
) {
  for (const object of objects) {
    const objectId = object.id

    for (const referenceId of referenceIDs) {
      console.log(`Creating references for ${objectId} to ${referenceId}`)

      await client.data
        .referenceCreator()
        .withClassName(CLASS_NAME)
        .withId(generateUuid5(objectId))
        .withReferenceProperty(referenceProperty)
        .withReference(
          client.data
            .referencePayloadBuilder()
            .withClassName(referenceClassName)
            .withId(generateUuid5(referenceId))
            .payload()
        )
        .do()
    }
  }
}
