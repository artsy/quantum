import dotenv from "dotenv"
import _ from "lodash"
import { describeImage, getArtworks, resizeImage } from "./helpers"
import { program } from "commander"
import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import chalk from "chalk"
import { GravityArtwork } from "./types"
import fs from "fs"
import path from "path"

dotenv.config()

const DEFAULT_BATCH_SIZE = 10
const OUTPUT_DIRECTORY = "./data/images"

const { batchSize, model } = processCommandLineArguments()

async function main() {
  const artworks = await getArtworks()
  const batches = _.chunk(artworks, batchSize)

  console.log(
    `Processing ${artworks.length} artworks in ${batches.length} batches with ${model.modelId}`
  )

  createOutputDirectory()

  for (const batch of batches) {
    await Promise.all(batch.map(processArtwork))
  }
  console.log("Done.")
}

async function processArtwork(artwork: GravityArtwork) {
  if (isAlreadyDescribed(artwork)) {
    console.log(chalk.gray.dim([artwork.id, artwork.slug].join(" ")))
    return
  }
  try {
    const resizedImageUrl = resizeImage(artwork.image_url, {
      height: 512,
      width: 512,
    })
    const description = await describeImage({
      url: resizedImageUrl,
      model,
    })
    const filePath = `${getOutputDirectory()}/${artwork.id}.json`
    fs.writeFileSync(filePath, JSON.stringify(description.object, null, 2))
    console.log(chalk.green([artwork.id, artwork.slug].join(" ")))
  } catch (error) {
    const filePath = `${getOutputDirectory()}/error-${artwork.id}.json`
    fs.writeFileSync(filePath, JSON.stringify(error, null, 2))
    console.log(chalk.red([artwork.id, artwork.slug].join(" ")))
  }
}

function isAlreadyDescribed(artwork: GravityArtwork) {
  const filePath = `${getOutputDirectory()}/${artwork.id}.json`
  try {
    const content = fs.readFileSync(filePath, "utf8")
    const data = JSON.parse(content)

    if (Object.prototype.hasOwnProperty.call(data, "description")) {
      return true
    }
    return false
  } catch (error) {
    return false
  }
}

function createOutputDirectory() {
  const directory = getOutputDirectory()
  // create if missing
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true })
  }
  return directory
}

function getOutputDirectory() {
  return path.join(__dirname, OUTPUT_DIRECTORY)
}

function processCommandLineArguments() {
  program
    .option(
      "-b, --batch-size <number>",
      "The number of artworks to process in each batch",
      DEFAULT_BATCH_SIZE.toString()
    )
    .option("-o, --openai", "Use OpenAI for computer vision", true)
    .option("-a, --anthropic", "Use Anthropic for computer vision", false)
    .parse(process.argv)

  const opts = program.opts()

  const batchSize = parseInt(opts.batchSize)
  const model = opts.openai
    ? openai("gpt-4o")
    : anthropic("claude-3-sonnet-20240229")

  const parsed = { batchSize, model }

  return parsed
}

main().catch(console.error)
