import weaviate from "weaviate-ts-client"
import dotenv from "dotenv"
import { deleteIfExists } from "system/weaviate"
import { ArtworksClassName } from "./types"

dotenv.config()

// Constants
const CLASS_NAME: ArtworksClassName = "InfiniteDiscoveryArtworks"

const client = weaviate.client({
  host: process.env.WEAVIATE_URL!,
})

async function main() {
  await prepareCollection()
}

main()

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
            skip: false,
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
        name: "saleMessage",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
          },
        },
      },
      {
        name: "colors",
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
    ],
  }

  const classResult = await client.schema
    .classCreator()
    .withClass(classWithProps)
    .do()

  console.log(JSON.stringify(classResult, null, 2))
}
