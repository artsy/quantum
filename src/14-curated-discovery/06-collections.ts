import weaviate, { generateUuid5 } from "weaviate-ts-client"
import _ from "lodash"
import { GravityArtworkCollection } from "./types"
import { deleteIfExists } from "system/weaviate"
import dotenv from "dotenv"
import { getCollections } from "./helpers"
import OpenAI from "openai"

dotenv.config()

const CLASS_NAME = "DiscoveryArtworkCollections"
const BATCH_SIZE = 100

const client = weaviate.client({
  host: process.env.WEAVIATE_URL!,
})

const openai = new OpenAI()

async function main() {
  await deleteIfExists(CLASS_NAME)
  await prepareCollectionsCollection()
  const collections = await getCollections()
  await insertCollections(collections)
}

/**
 * Create and configure a new collection to hold collections
 */
async function prepareCollectionsCollection() {
  const classWithProps = {
    class: CLASS_NAME,
    vectorizer: "text2vec-openai",
    moduleConfig: {
      "text2vec-openai": {
        model: "text-embedding-3-small",
        dimensions: 1536,
        type: "text",
        vectorizeClassName: true,
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
        name: "title",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
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
        name: "description",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "short_description",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
          },
        },
      },
      {
        name: "category",
        dataType: ["text[]"],
        description:
          "The 'name's of the genes pulled from associated 'gene_ids' in Gravity's MarketingCollection Model",
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "group",
        dataType: ["text"],
        description:
          "Renamed key for the value of 'category' in Gravity's MarketingCollection Model",
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "price_guidance",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
          },
        },
      },
      {
        name: "image_url",
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

/**
 * Insert collections into Weaviate
 *
 * Also assigns a deterministic UUID to each collection,
 * based on its Gravity ID
 */
async function insertCollections(
  collections: GravityArtworkCollection[],
  batchSize: number = BATCH_SIZE
) {
  console.log(`Inserting collection: ${collections.length}`)

  const batches = _.chunk(collections, batchSize)
  console.log(`Inserting ${batches.length} batches`)

  for (const collectionsBatch of batches) {
    const shortDescriptions = await batchShortDescriptions(collectionsBatch)

    let batcher = client.batch.objectsBatcher()
    batcher = batcher.withObjects(
      ...collectionsBatch.map((collection) => {
        return {
          class: CLASS_NAME,
          properties: {
            internalID: collection.id,
            category: collection.category,
            description: collection.description,
            short_description: shortDescriptions[collection.id],
            group: collection.group,
            image_url: collection.image_url,
            price_guidance: collection.price_guidance,
            slug: collection.slug,
            title: collection.title,
          },
          id: generateUuid5(collection.id),
        }
      })
    )
    process.stdout.write(".")
    await batcher.do()
  }
  process.stdout.write("\n")
}

async function getShortDescription(description: string) {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "Your task is to take a description of a collection of Artworks and cut it down to one, plain text formatted, sentence. Maintain the tone and voice of the original description.",
      },
      { role: "user", content: description },
    ],
    model: "gpt-4o",
  })

  return completion.choices[0].message.content
}

export async function batchShortDescriptions(
  collections: GravityArtworkCollection[]
): Promise<{ [key: string]: string }> {
  const imageFieldPairs = await Promise.all(
    collections.map(async (collection) => {
      const shortDescription = await getShortDescription(collection.description)
      return [collection.id, shortDescription]
    })
  )
  const imageData = _.fromPairs(imageFieldPairs)
  return imageData
}

main().catch(console.error)
