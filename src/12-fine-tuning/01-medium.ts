import { prepareData } from "./lib/data"
import { uploadData } from "./lib/file"
import { submitFineTuneJob } from "./lib/fine-tune"
import { assessFineTune, summarizeResults } from "./lib/test"

export const SELECTED_INPUT = "medium-sample-100"

async function main() {
  await prepareData()
  const uploadedFiles = await uploadData()
  const fineTune = await submitFineTuneJob(uploadedFiles)
  const results = await assessFineTune({ modelId: fineTune.fine_tuned_model! })
  summarizeResults(results)
}

main()
