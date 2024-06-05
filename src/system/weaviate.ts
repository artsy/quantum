import weaviate, { WeaviateClient } from "weaviate-ts-client"
import dotenv from "dotenv"

dotenv.config()

/**
 * Delete a Weaviate class if it exists
 *
 * @param className The name of the class to delete
 * @param client An optional Weaviate client to use. Else will default to a new client that connects to WEAVIATE_URL
 */
export async function deleteIfExists(
  className: string,
  client?: WeaviateClient
) {
  client ||= weaviate.client({
    host: process.env.WEAVIATE_URL!,
  })

  const alreadyExists = await client.schema.exists(className)

  if (alreadyExists) {
    console.log(`${className} class already exists, deleting it`)
    await client.schema.classDeleter().withClassName(className).do()
  }
}
