import _ from "lodash"
import { ArtworksClassName, GravityArtwork } from "./types"
import { deleteIfExists } from "system/weaviate"
import { getArtworks } from "./helpers"
import dotenv from "dotenv"
import weaviate, { generateUuid5 } from "weaviate-ts-client"

dotenv.config()

// Constants
const CLASS_NAME: ArtworksClassName = "InfiniteDiscoveryArtworks"
const BATCH_SIZE: number = 100

const client = weaviate.client({
  host: process.env.WEAVIATE_URL!,
})

async function main() {
  await prepareCollection()
  const artworks = await getArtworks()
  await insertArtworks(artworks)
}

async function prepareCollection() {
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
        name: "internalID",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
          },
        },
      },
      {
        name: "rarity",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
          },
        },
      },
      {
        name: "medium",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "colors",
        dataType: ["text[]"],
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
        name: "url",
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
        name: "imageUrl",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
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
        name: "date",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "materials",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "tags",
        dataType: ["text[]"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "additionalInformation",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "artistName",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "artistNationality",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "artistBirthday",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "artistGender",
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

// Run the script
main()
