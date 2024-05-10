import OpenAI from "openai"
import dotenv from "dotenv"
import weaviate from "weaviate-ts-client"

dotenv.config()
const openai = new OpenAI()

// spell-checker:disable
const artist_1_bio = `Yayoi Kusama dazzles audiences worldwide with her immersive “Infinity Mirror Rooms” and an aesthetic that embraces light, polka dots, and pumpkins. The avant-garde artist first rose to prominence in 1960s New York, where she staged provocative Happenings and exhibited hallucinatory paintings of loops and dots that she called “Infinity Nets.” Kusama also influenced Andy Warhol and augured the rise of feminist and Pop art. She has been the subject of major exhibitions at the Museum of Modern Art, Centre Pompidou, Tate Modern, and the National Museum of Modern Art in Tokyo. In 1993, Kusama represented Japan at the Venice Biennale. Today, her work regularly sells for seven figures on the secondary market. Throughout her disparate practice, Kusama has continued to explore her own obsessive-compulsive disorder, sexuality, freedom, and perception. In 1977, Kusama voluntarily checked herself into a psychiatric hospital in Tokyo, where she continues to live today.`

const artist_2_bio = `Claude Monet’s lush, light-dappled plein air paintings exemplify the aesthetics of the Impressionist movement, which the artist helped establish in late 1800s France. Monet keenly observed and rendered urban environments, his iconic water lily gardens, haystacks, and other pastoral landscapes. He painted each setting over and over again in order to capture changes in light and ambiance. As he evoked the particularities of the environment, his brushstrokes could veer towards abstraction. Both his mark-making and rich color palettes helped establish a path for 20th-century painting. Monet’s work belongs in the collections of the Metropolitan Museum of Art, the Musée de l’Orangerie, the Art Institute of Chicago, the Museum of Fine Arts, Boston, and many others. In 2019, his painting Mueles (1891) became the most expensive Impressionist artwork ever sold at auction when it notched $110.7 million.`
// spell-checker:enable

async function main() {
  /*
   * EMBED with OpenAI
   */

  const artist_1_response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: artist_1_bio,
    encoding_format: "float",
  })

  const artist_1_vector = artist_1_response.data[0].embedding

  const artist_2_response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: artist_2_bio,
    encoding_format: "float",
  })

  const artist_2_vector = artist_2_response.data[0].embedding

  console.log("artist_1_vector", artist_1_vector.slice(0, 10))
  console.log("artist_2_vector", artist_2_vector.slice(0, 10))

  /*
   * PERSIST with Weaviate
   */

  const client = weaviate.client({
    scheme: "https",
    host: "https://weaviate.stg.artsy.systems",
  })

  // delete the class if it exists

  const className: string = "ArtistBio" // Replace with your class name
  await client.schema.classDeleter().withClassName(className).do()

  // Add the class to the Weaviate schema

  const classWithProps = {
    class: "ArtistBio",

    properties: [
      {
        name: "bio",
        dataType: ["text"],
      },
    ],
  }

  const classResult = await client.schema
    .classCreator()
    .withClass(classWithProps)
    .do()

  console.log(classResult) // The returned value is the full class definition

  // Insert the bios as new objects to the ArtistBio collection

  let objectResult = await client.data
    .creator()
    .withClassName("ArtistBio")
    .withProperties({
      bio: artist_1_bio,
    })
    .withVector(artist_1_vector)
    .do()

  console.log(objectResult) // the returned value is the object

  objectResult = await client.data
    .creator()
    .withClassName("ArtistBio")
    .withProperties({
      bio: artist_2_bio,
    })
    .withVector(artist_2_vector)
    .do()

  console.log(objectResult) // the returned value is the object
}

main()

// And now you can view the results of this in Weaviate's GraphQL playground:
// https://link.weaviate.io/3QBEmlH
