import weaviate from "weaviate-ts-client"
import { CLASS_NAME } from "../../02-insert-articles"

/**
 * Prepare a new Weaviate collection for articles and configure its properties and vectorization
 */
export async function prepareArticlesCollection() {
  const client = weaviate.client({
    scheme: "https",
    host: "https://weaviate.stg.artsy.systems",
  })

  const alreadyExists = await client.schema.exists(CLASS_NAME)

  if (alreadyExists) {
    console.log(`${CLASS_NAME} class already exists, deleting it`)
    await client.schema.classDeleter().withClassName(CLASS_NAME).do()
  }

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
            // vectorizePropertyName: false,
          },
        },
      },
      {
        name: "title",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
            // vectorizePropertyName: false,
          },
        },
      },
      {
        name: "href",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
            // vectorizePropertyName: false,
          },
        },
      },
      {
        name: "publishedAt",
        dataType: ["date"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
            // vectorizePropertyName: false,
          },
        },
      },
      {
        name: "byline",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
            // vectorizePropertyName: false,
          },
        },
      },
      // {
      //   name: "keyword",
      //   dataType: ["text"],
      //   moduleConfig: {
      //     "text2vec-openai": {
      //       skip: true,
      //       // vectorizePropertyName: false,
      //     },
      //   },
      // },
      {
        name: "vertical",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
            // vectorizePropertyName: false,
          },
        },
      },
      {
        name: "channelName",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true,
            // vectorizePropertyName: false,
          },
        },
      },
      {
        name: "head",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            // vectorizePropertyName: false,
          },
        },
      },
      {
        name: "body",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: true, // TODO: vectorize separately?
            // vectorizePropertyName: false,
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
