import _ from "lodash"
import { anthropic } from "@ai-sdk/anthropic"
import { LanguageModel, generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import chalk from "chalk"
import dedent from "dedent"
import dotenv from "dotenv"
import fs from "fs"
import pAll from "p-all"
import pSeries from "p-series"

dotenv.config()

const MODELS: Record<string, LanguageModel> = {
  turbo: openai("gpt-3.5-turbo"),
  fourO: openai("gpt-4o"),
  haiku: anthropic("claude-3-haiku-20240307"),
  // sonnet: anthropic("claude-3-sonnet-20240229"),
  sonnet35: anthropic("claude-3-5-sonnet-20240620"),
  opus: anthropic("claude-3-opus-20240229"),
}

const EXAMPLES = [
  "I’d spend up to $100,000 this year on my collection.",
  "I have $30,000 left in my decorating budget and I’d like to fill the walls with art.",
  "I will spend $500 - $1,000 on this artwork.",
  "none of your business",
  "under 1k",
  "1000 quid",
  "I have 10k to spend on two works",
]

const chalkFn: Record<string, (...args: string[]) => void> = {
  turbo: chalk.green,
  fourO: chalk.green.dim,
  haiku: chalk.blue,
  opus: chalk.blue.dim,
  sonnet: chalk.cyan,
  sonnet35: chalk.cyan.dim,
}

const system = dedent`
  Your task is to analyze a plaintext budget statement
  and produce a structured object to describe it.

  If a budget expresses a range, set min and max accordingly.

  If a budget expresses a single amount, then set min to 0 and max to the amount.

  If a budget cannot be inferred, set both min and max to -1.
`

const prompt = (statement: string) => dedent`
  Analyze the following budget statement and produce a structured object to describe it.

  BUDGET STATEMENT: ${statement}
`
const schema = z.object({
  budget: z
    .object({
      currency: z
        .string()
        .default("USD")
        .describe("ISO currency code. Assume USD if not otherwise specified."),
      min: z
        .number()
        .default(0)
        .describe(
          "A minimum amount. Default to 0 if not otherwise specified. Set this to a non-zero number ONLY IF the user has explicitly specified a minimum."
        ),
      max: z.number().describe("A maximum amount."),
    })
    .describe("The user's budget. If unspecified, set to the range [-1, -1]."),
  numberOfArtworks: z
    .number()
    .default(1)
    .describe(
      "The number of artworks the user wishes to buy. Default 1 to unless otherwise specified."
    ),
  timeSpan: z
    .object({
      number: z.number().optional().describe("How many of the time units"),
      unit: z
        .enum(["day", "week", "month", "year"])
        .optional()
        .describe("The unit of time"),
    })
    .optional()
    .describe(
      "The time span over which the user wishes to buy. Omit if unspecified."
    ),
})

const doLLM = async (modelName: string, example: string) => {
  const start = Date.now()

  const intent = await generateObject({
    model: MODELS[modelName],
    temperature: 0,
    system,
    prompt: prompt(example),
    schema,
  })

  const elapsedMS = Date.now() - start

  const exampleNum = EXAMPLES.indexOf(example)
  const modelNum = Object.keys(MODELS).indexOf(modelName)

  console.log(
    chalkFn[modelName](
      new Date().toISOString(),
      modelName,
      example.slice(0, 40)
    )
  )

  return {
    exampleNum,
    modelNum,
    example,
    modelName,
    elapsedMS,
    intent: JSON.stringify(intent.object),
  }
}

async function main() {
  const file = fs.openSync("budgetIntents.ndjson", "w")

  /* Each example in series, each model in parallel */
  const exampleThunks = EXAMPLES.map((example) => () => {
    const modelThunks = _.keys(MODELS).map(
      (modelName) => () => doLLM(modelName, example)
    )

    return pAll(modelThunks)
  })

  const exampleResults = await pSeries(exampleThunks)
  const flatResults = _.flatten(exampleResults)

  flatResults.map((result) => {
    fs.appendFileSync(file, JSON.stringify(result) + "\n")
  })

  fs.closeSync(file)
  console.log("Done")
}

main()
