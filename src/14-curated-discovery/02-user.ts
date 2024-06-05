import { deleteIfExists } from "system/weaviate"
import weaviate, { generateUuid5 } from "weaviate-ts-client"
import _ from "lodash"
import { ClassName, ReferenceProperty, User } from "./types"
import dotenv from "dotenv"
import { getArtworks } from "./helpers"

dotenv.config()

// Constants
const ARTWORKS_SAMPLE_SIZE: number = 5
const CLASS_NAME: ClassName = "DiscoveryUsers"
const USER: User = { id: "abc123", name: "Percy The Cat" }

const client = weaviate.client({
  host: process.env.WEAVIATE_URL!,
})

async function main() {
  const sampleArtworkIds = await getSampleArtworkIds()

  await prepareUserCollection()
  await insertUser()
  await createReferences(
    USER,
    sampleArtworkIds,
    "DiscoveryArtworks",
    "likedArtworks"
  )
}

async function prepareUserCollection() {
  await deleteIfExists(CLASS_NAME)

  const classSchema = {
    class: CLASS_NAME,
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

async function insertUser() {
  await client.data
    .creator()
    .withClassName(CLASS_NAME)
    .withProperties(_.omit(USER, "id"))
    .withId(generateUuid5(USER.id))
    .do()
}

async function createReferences(
  object: User,
  referenceIds: string[],
  referenceClassName: ClassName,
  referenceProperty: ReferenceProperty
) {
  const objectId = object.id

  for (const referenceId of referenceIds) {
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

async function getSampleArtworkIds() {
  const artworks = await getArtworks()
  const shuffledArtworks = _.shuffle(artworks)
  const sampleArtworks = shuffledArtworks.slice(0, ARTWORKS_SAMPLE_SIZE)
  const sampleArtworkIds = sampleArtworks.map((artwork) => artwork.id)
  return sampleArtworkIds
}

main()
