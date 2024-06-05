import path from "path"
import fs from "fs"
import weaviate, { generateUuid5 } from "weaviate-ts-client"
import _ from "lodash"
import { GravityArtwork } from "./types"
import { deleteIfExists } from "system/weaviate"
import dotenv from "dotenv"

dotenv.config()

const CLASS_NAME = "DiscoveryArtworks"
const BATCH_SIZE = 100

const client = weaviate.client({
  host: process.env.WEAVIATE_URL!,
})

async function main() {
  await deleteIfExists(CLASS_NAME)
  await prepareArtworkCollection()
  const artworks = await getArtworks()
  await insertArtworks(artworks)
}

/**
 * Create and configure a new collection to hold artworks
 */
async function prepareArtworkCollection() {
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
        name: "title",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "date",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
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
        name: "materials",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "dimensions",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "price",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "listPriceAmount",
        dataType: ["number"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
          },
        },
      },
      {
        name: "listPriceCurrency",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
          },
        },
      },
      {
        name: "artworkLocation",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "categories",
        dataType: ["text[]"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "tags",
        dataType: ["text[]"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "additionalInformation",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "imageUrl",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
          },
        },
      },
      {
        name: "imageDescription",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: true,
          },
        },
      },
      {
        name: "artistID",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
          },
        },
      },
      {
        name: "partnerID",
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
 * Read artworks from a local JSON file
 *
 * The JSON file will be gitignored, but the data can
 * be obtained from a shared folder, currently at:
 *
 * https://drive.google.com/drive/u/1/folders/1Lh7msUc0R_JlpNEzApZ4YbqB8x5tbpws
 */
async function getArtworks() {
  const filePath = path.join(__dirname, "./data/artworks.json")
  const data = await fs.promises.readFile(filePath, "utf-8")
  const artworks: GravityArtwork[] = JSON.parse(data)
  return artworks
}

/**
 * Insert artworks into Weaviate
 *
 * Also assigns a deterministic UUID to each artwork,
 * based on its Gravity ID
 */
async function insertArtworks(
  artworks: GravityArtwork[],
  batchSize: number = BATCH_SIZE
) {
  console.log(`Inserting artwork: ${artworks.length}`)

  const batches = _.chunk(artworks, batchSize)
  console.log(`Inserting ${batches.length} batches`)

  for (const artworkBatch of batches) {
    let batcher = client.batch.objectsBatcher()
    batcher = batcher.withObjects(
      ...artworkBatch.map((artwork) => {
        return {
          class: CLASS_NAME,
          properties: {
            internalID: artwork.id,
            slug: artwork.slug,
            title: artwork.title,
            date: artwork.date,
            rarity: artwork.rarity,
            medium: artwork.medium,
            materials: artwork.materials,
            dimensions: artwork.dimensions,
            price: artwork.price,
            listPriceAmount: artwork.list_price_amount,
            listPriceCurrency: artwork.list_price_currency,
            artworkLocation: artwork.artwork_location,
            categories: artwork.categories,
            tags: artwork.tags,
            additionalInformation: artwork.additional_information,
            imageUrl: artwork.image_url,
            imageDescription: null, // TODO: add computer vision step?
            artistID: artwork.artist_id,
            partnerID: artwork.partner_id,
          },
          id: generateUuid5(artwork.id),
        }
      })
    )
    process.stdout.write(".")
    await batcher.do()
  }
  process.stdout.write("\n")
}

main().catch(console.error)
