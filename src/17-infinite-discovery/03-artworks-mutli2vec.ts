import weaviate, { generateUuid5 } from "weaviate-ts-client"
import { chunk } from "lodash"
import { GravityArtwork } from "./types"
import { deleteIfExists } from "system/weaviate"
import dotenv from "dotenv"
import { getArtworks, getImageDataForArtworks } from "./helpers"

dotenv.config()

const CLASS_NAME = "InfiniteDiscoveryArtworks"
const BATCH_SIZE = 2

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
    vectorizer: "multi2vec-clip",
    moduleConfig: {
      "multi2vec-clip": {
        textFields: [
          "title",
          "medium",
          "materials",
          "categories",
          "tags",
          "additionalInformation",
        ],
        imageFields: ["image"],
      },
    },
    properties: [
      {
        name: "internalID",
        dataType: ["text"],
      },
      {
        name: "rarity",
        dataType: ["text"],
      },
      {
        name: "medium",
        dataType: ["text"],
      },
      {
        name: "colors",
        dataType: ["text[]"],
      },
      {
        name: "slug",
        dataType: ["text"],
      },
      {
        name: "url",
        dataType: ["text"],
      },
      {
        name: "title",
        dataType: ["text"],
      },
      {
        name: "imageUrl",
        dataType: ["text"],
      },
      {
        name: "listPriceAmount",
        dataType: ["number"],
      },
      {
        name: "listPriceCurrency",
        dataType: ["text"],
      },
      {
        name: "date",
        dataType: ["text"],
      },
      {
        name: "materials",
        dataType: ["text"],
      },
      {
        name: "tags",
        dataType: ["text[]"],
      },
      {
        name: "additionalInformation",
        dataType: ["text"],
      },
      {
        name: "artistName",
        dataType: ["text"],
      },
      {
        name: "artistNationality",
        dataType: ["text"],
      },
      {
        name: "artistBirthday",
        dataType: ["text"],
      },
      {
        name: "artistGender",
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

  const batches = chunk(artworks, batchSize)
  console.log(`Inserting ${batches.length} batches`)

  for (const artworkBatch of batches) {
    const imageData = await getImageDataForArtworks(artworkBatch)

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
            listPriceAmount: artwork.list_price_amount,
            listPriceCurrency: artwork.list_price_currency,
            categories: artwork.categories,
            tags: artwork.tags,
            additionalInformation: artwork.additional_information,
            imageUrl: artwork.image_url,
            colors: artwork.colors,
            artistName: artwork.artist_name,
            artistNationality: artwork.artist_nationality,
            artistBirthday: artwork.artist_birthday,
            artistGender: artwork.artist_gender,
            image: imageData[artwork.id],
          },
          id: generateUuid5(artwork.id),
        }
      })
    )
    process.stdout.write(".")
    await batcher.do()
  }
  process.stdout.write("\n")
  console.log("Done.")
}

main().catch(console.error)
