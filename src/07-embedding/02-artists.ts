import { ARTIST_IDS } from "./artist-ids"
import weaviate from "weaviate-ts-client"

const CLASS_NAME: string = "ArtistBio2"

async function main() {
  const artists = await fetchArtists({ size: 100 })
  await prepareArtistsCollection()
  await insertArtists(artists)
}

main()

async function prepareArtistsCollection() {
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
        model: "ada",
        dimensions: 1536,
        type: "text",
        vectorizeClassName: false,
      },
    },
    properties: [
      {
        name: "blurb",
        dataType: ["text"],
        moduleConfig: {
          "text2vec-openai": {
            skip: false,
            vectorizePropertyName: false,
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

async function insertArtists(artists: { slug: string; blurb: string }[]) {
  console.log(`Going to insert ${artists.length} artists`)
}

async function fetchArtists(args: { size: number }) {
  const query = `query getArtists ($size: Int!, $ids: [String]!) {
    artistsConnection(first: $size, ids: $ids) {
      edges {
        node {
          slug
          blurb
        }
      }
    }
  }
  `

  const variables = {
    size: args.size,
    ids: ARTIST_IDS,
  }

  const headers = {
    "Content-Type": "application/json",
  }

  const response = await metaphysics({ query, variables, headers })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return response.data.artistsConnection.edges.map((edge: any) => edge.node)
}

async function metaphysics(args: {
  query: string
  variables: Record<string, unknown>
  headers: Record<string, string>
}) {
  const { query, variables, headers } = args

  const url = "https://metaphysics-staging.artsy.net/v2"

  const body = JSON.stringify({ query, variables })
  const options = { method: "POST", headers, body }

  const response = await fetch(url, options)
  const json = await response.json()
  return json
}
