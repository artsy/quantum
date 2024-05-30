import { prepareData } from "./lib/data"
import { uploadData } from "./lib/file"
import { submitFineTuneJob } from "./lib/fine-tune"
import { assessFineTune, summarizeResults } from "./lib/test"

export const SELECTED_INPUT = "medium-sample-100"

/**
 * Adds a script to create a fine-tuned model for inferring artwork mediums from their materials descriptions
 *
 * yarn tsx src/12-fine-tuning/01-medium.ts
 *
 * This will generate properly formatted training data, upload it, and kick off a fine-tuning job.
 *
 * Once it completes, it will send it some test data and print out the results.
 */

async function main() {
  await prepareData()
  const uploadedFiles = await uploadData()
  const fineTune = await submitFineTuneJob(uploadedFiles)
  const results = await assessFineTune({ modelId: fineTune.fine_tuned_model! })
  summarizeResults(results)
}

main()
