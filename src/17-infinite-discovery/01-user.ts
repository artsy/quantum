import weaviate, { generateUuid5 } from "weaviate-ts-client"
import _ from "lodash"
import dotenv from "dotenv"
import { UsersClassName, User } from "./types"
import { deleteIfExists } from "system/weaviate"

// Config
dotenv.config()

// Constants
const CLASS_NAME: UsersClassName = "InfiniteDiscoveryUsers"
const USERS: User[] = []
const BATCH_SIZE: number = 10

const client = weaviate.client({
  host: process.env.WEAVIATE_URL!,
})

async function main() {
  await prepareCollection(CLASS_NAME)
  if (USERS.length !== 0) {
    await insertObjects(USERS, BATCH_SIZE)
  }
}

main()

async function prepareCollection(className: UsersClassName) {
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
        name: "internalID",
        dataType: ["string"],
        description: "Artsy's internal ID for the user.",
      },
      {
        name: "likedArtworks",
        dataType: ["InfiniteDiscoveryArtworks"],
        description:
          "Artworks liked by this user. Used to calculate the user's vector.",
      },
      {
        name: "DislikedArtworks",
        dataType: ["InfiniteDiscoveryArtworks"],
        description:
          "Artworks disliked by this user. Used to calculate filter the artworks from infinite discovery results.",
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
          properties: user,
          id: generateUuid5(user.internalID),
        }
      })
    )
    process.stdout.write(`${userBatch.length}`)
    await batcher.do()
  }
  process.stdout.write("\n")
}
