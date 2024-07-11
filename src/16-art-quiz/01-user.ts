import weaviate from "weaviate-ts-client"
import dotenv from "dotenv"
import { deleteIfExists } from "system/weaviate"
import { ClassName } from "./types"

// Config
dotenv.config()

// Constants
const CLASS_NAME: ClassName = "ArtQuizUsers"

const client = weaviate.client({
  host: process.env.WEAVIATE_URL!,
})

async function main() {
  await prepareCollection(CLASS_NAME)
}

main()

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
        name: "likedArtworks",
        dataType: ["ArtQuizArtworks"],
        description: "Artworks liked by this user",
      },
      {
        name: "dislikedArtworks",
        dataType: ["ArtQuizArtworks"],
        description: "Artworks disliked by this user",
      },
      {
        name: "name",
        dataType: ["string"],
        description: "Name of the user",
      },
    ],
  }

  const classResult = await client.schema
    .classCreator()
    .withClass(classSchema)
    .do()

  console.log(JSON.stringify(classResult, null, 2))
}
