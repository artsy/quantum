import { deleteIfExists } from "system/weaviate"
import weaviate, { generateUuid5 } from "weaviate-ts-client"
import _ from "lodash"
// import { getArtworks } from "./01-ingest-artworks"
import { ClassName, GravityArtwork, ReferenceProperty, User } from "./types"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"

dotenv.config()

// Constants
const CLASS_NAME: ClassName = "DiscoveryUsers"
const USER: User = { id: "abc123", name: "Test" }
const BATCH_SIZE: number = 10
const SAMPLE_SIZE: number = 5

const client = weaviate.client({
  host: process.env.WEAVIATE_URL!,
})

async function main() {
  // const artworks = await getArtworks()
  const filePath = path.join(__dirname, "./data/artworks.json")
  const data = await fs.promises.readFile(filePath, "utf-8")
  const artworks: GravityArtwork[] = JSON.parse(data)
  const sampleArtworkIds = _.shuffle(artworks.map((el) => el.id)).slice(
    0,
    SAMPLE_SIZE
  )

  await prepareCollection("DiscoveryUsers")
  await insertObjects([USER], BATCH_SIZE)
  await createReferences(
    USER,
    sampleArtworkIds,
    "DiscoveryArtworks",
    "likedArtworks"
  )
}

async function prepareCollection(className: ClassName) {
  await deleteIfExists(className)

  const classSchema = {
    class: className,
    moduleConfig: {
      "ref2vec-centroid": {
        referenceProperties: ["likedArtworks"],
      },
    },
    vectorizer: "ref2vec-centroid",
    properties: [
      {
        name: "name",
        dataType: ["string"],
        description: "Name of the user",
      },
      {
        name: "likedArtworks",
        dataType: ["DiscoveryArtworks"],
        description: "Artworks liked by the user",
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
          class: "DiscoveryUsers",
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
  object: User,
  referenceIDs: string[],
  referenceClassName: ClassName,
  referenceProperty: ReferenceProperty
) {
  const objectId = object.id

  for (const referenceId of referenceIDs) {
    console.log(`Creating references for ${objectId} to ${referenceId}: `)

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

main()
