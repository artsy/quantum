import fs from "fs"
import path from "path"
import dedent from "dedent"
import { SELECTED_INPUT } from "12-fine-tuning/01-medium"

const SYSTEM_PROMPT =
  "Your task is to identify the medium (aka 'medium type') of an artwork based on a description of the materials within it. If you cannot infer the medium type then answer with the string <unknown>."

/**
 * Takes raw data from Gravity of the form…
 *
 * ```json
 * { "category": "Painting", "medium": "Oil on Wood" }
 * { "category": "Sculpture", "medium": "Stoneware" }
 * ```
 * …and turns it into properly formatted training and validation data for the model.
 *
 * The raw data files are expected in the `data/raw` directory, in JSONL format.
 */
export async function prepareData() {
  const dataPath = path.resolve(
    __dirname,
    "..",
    "data",
    "raw",
    `${SELECTED_INPUT}.jsonl`
  )
  const data = fs.readFileSync(dataPath, "utf-8")

  const trainingSetPath = path.resolve(
    __dirname,
    "..",
    "data",
    "training",
    "medium-training-data.jsonl"
  )
  const trainingSet = fs.createWriteStream(trainingSetPath)

  const validationSetPath = path.resolve(
    __dirname,
    "..",
    "data",
    "training",
    "medium-validation-data.jsonl"
  )
  const validationSet = fs.createWriteStream(validationSetPath)

  const documents = data.split("\n")
  const trainingSetSize = Math.round(0.8 * documents.length)
  const validationSetSize = documents.length - trainingSetSize

  const trainingDocuments = documents.slice(0, trainingSetSize)
  const validationDocuments = documents.slice(trainingSetSize, documents.length)

  console.log(`\nWriting ${trainingSetSize} training data…`)
  trainingDocuments.forEach(async (doc) => {
    process.stdout.write(".")
    trainingSet.write(formatExample(doc) + "\n")
  })
  trainingSet.end()
  console.log("\nDone.")

  console.log(`\nWriting ${validationSetSize} validation data…`)
  validationDocuments.forEach(async (doc) => {
    process.stdout.write(".")
    validationSet.write(formatExample(doc) + "\n")
  })
  validationSet.end()

  // artificial delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  console.log("\nDone.")
}

/**
 * Takes a category/medium pair and formats it as a training example.
 *
 * @param inputDocument Object of the form `{ "category": "Painting", "medium": "Oil on Wood" }`
 * @returns a message list consisting of a system prompt, user input, and ideal assistant response.
 */
function formatExample(inputDocument: string) {
  const { category, medium } = JSON.parse(inputDocument)
  return dedent`
  { "messages": [ { "role": "system", "content": "${SYSTEM_PROMPT}" }, { "role": "user", "content": "${medium}" }, { "role": "assistant", "content": "${category}" }]}
  `
}
