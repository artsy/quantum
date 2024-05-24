import dotenv from "dotenv"
import _ from "lodash"
import chalk from "chalk"
import { streamText, LanguageModel } from "ai"
import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import dedent from "dedent"
import { getImageDescription } from "./image"
import { getData } from "./data"
import { program } from "commander"

dotenv.config()

// define CLI

program
  .description("Generate a narrative for any artwork + user pair")
  .option("-a, --artwork <id or slug>", "Artwork ID")
  .option("-u, --user <id>", "User ID")
  .option(
    "-n, --numArtworks <number>",
    "Number of user MyC artworks for context",
    "10"
  )
  .option(
    "-m, --vendor < openai | anthropic >",
    "Vendor model to use",
    "anthropic"
  )
  .parse(process.argv)

// main

async function main() {
  // parse arguments, from CLI or ENV
  const options = program.opts()
  const artworkID = options.artwork ?? process.env.ARTWORK_ID
  const userID = options.user ?? process.env.USER_ID
  const numArtworks = parseInt(options.numArtworks)
  const vendor = options.vendor ?? "anthropic"

  if (!artworkID || !userID) {
    throw new Error(
      "Please provide an artwork ID and user ID, via --user and --artwork command line arts, or via USER_ID and ARTWORK_ID env vars."
    )
  }

  // choose model

  let model: LanguageModel

  switch (vendor) {
    case "openai":
      model = openai("gpt-4o")
      break
    case "anthropic":
      model = anthropic("claude-3-sonnet-20240229")
      break
    default:
      throw new Error(`Unknown vendor: ${vendor}`)
  }

  console.log(chalk.red.bold(`Model: ${model.modelId}\n`))

  // fetch primary data re artwork, collector, etc

  const data = await getData({
    artworkID,
    userID,
    numMyCollectionArtworks: numArtworks,
  })
  const { artwork, partner, artist, user, collectedArtworks } = data

  console.log(chalk.red.bold(`Artwork: ${artwork.slug}\n`))
  console.log(chalk.red.bold(`User: ${userID}\n`))

  // fetch multimodal generated image description

  const imageUrl = artwork.image.resized.url
  process.stdout.write(chalk.red.underline(`${imageUrl}\n\n`))
  process.stdout.write(
    chalk.red.bold(`Generating image description via multimodal request…\n\n`)
  )
  const imageDescription = await getImageDescription(model, artwork)

  // system prompt

  const system = dedent`
  You are an experienced art advisor who advises collectors about
  which works to collect and why.

  If a work is a good match, you say why you think so.

  You make use of the provided context to tailor your response
  for this specific collector and artwork.

  You only make factual claims based on the provided context.

  You offer concise and direct explanations, with a minimum of extraneous
  adjectives and filler words.
  `

  // prompt

  const prompt = dedent`
  Here is some context about the artwork, artist, gallery, and
  the collector who is considering this work.

  """
  ARTWORK:

  ${JSON.stringify(_.omit(artwork, "slug", "image"), null, 2)}

  ARTWORK IMAGE DESCRIPTION:

  ${imageDescription}

  ARTIST:

  ${JSON.stringify(artist, null, 2)}

  GALLERY:

  ${JSON.stringify(partner, null, 2)}

  COLLECTOR:

  ${JSON.stringify(_.omit(user, "email"), null, 2)}

  COLLECTOR'S ART COLLECTION:

  ${JSON.stringify(collectedArtworks, null, 2)}
  """

  Based on that, decide if this artwork would be a good addition to that
  user's collection. Write the user a 150 word explanation regarding
  why or why not. Do not include salutations or sign-offs,
  just the explanation.
`

  console.log(chalk.magenta(`${system}\n`))
  console.log(chalk.magenta.bold(`${prompt}\n`))

  // final LLM output

  const response = await streamText({
    model,
    temperature: 0,
    seed: 42,
    system,
    prompt,
  })

  for await (const chunk of response.textStream) {
    process.stdout.write(chalk.bold.blue(chunk))
  }
  process.stdout.write("\n\n")

  console.log(chalk.dim(JSON.stringify(await response.usage)))
}

main().catch(console.error)
