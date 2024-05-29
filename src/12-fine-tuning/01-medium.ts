import { prepareData } from "./lib/data"
import { uploadData } from "./lib/file"

export const SELECTED_INPUT = "medium-sample-100"

async function main() {
  await prepareData()
  await uploadData()
}

main()
