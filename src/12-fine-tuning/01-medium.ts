import { prepareData } from "./lib/data"
import { uploadData } from "./lib/file"
import { submitFineTuneJob } from "./lib/fine-tune"

export const SELECTED_INPUT = "medium-sample-100"

async function main() {
  await prepareData()
  const uploadedFiles = await uploadData()
  await submitFineTuneJob(uploadedFiles)
}

main()
