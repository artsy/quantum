import weaviate, { generateUuid5 } from "weaviate-ts-client"
import { getArtists, getArtworks } from "./helpers"
import _ from "lodash"
import dotenv from "dotenv"
import chalk from "chalk"

dotenv.config()

async function main() {
  const client = weaviate.client({
    host: process.env.WEAVIATE_URL!,
  })

  // Add a new property on the DiscoveryArtworks class
  console.log(chalk.yellow("Creating hasArtist property"))

  await client.schema
    .propertyCreator()
    .withClassName("DiscoveryArtworks")
    .withProperty({
      name: "hasArtist",
      dataType: ["DiscoveryArtists"],
    })
    .do()

  const artworks = await getArtworks()
  const artists = await getArtists()

  // Track how many artworks that have had an artist reference added
  let artworksReferenced = 0

  // iterate over artists
  for (const artist of artists) {
    // Get all artworks by the current artist
    const artworksByArtist = _.filter(artworks, { artist_id: artist.id })

    artworksReferenced += artworksByArtist.length

    console.log(
      chalk.green(
        `Adding references on ${artworksByArtist.length} artwork(s) by ${artist.name}`
      )
    )

    // iterate over artworks by the current artist
    for (const artwork of artworksByArtist) {
      console.log(`Artwork: ${artwork.id} -> Artist: ${artist.id}`)

      await client.data
        .referenceCreator()
        .withClassName("DiscoveryArtworks")
        .withId(generateUuid5(artwork.id))
        .withReferenceProperty("hasArtist")
        .withReference(
          client.data
            .referencePayloadBuilder()
            .withClassName("DiscoveryArtists")
            .withId(generateUuid5(artist.id))
            .payload()
        )
        .do()
    }
  }
  console.log(chalk.cyan(`Added ${artworksReferenced} artworks to artists`))
}

main()
