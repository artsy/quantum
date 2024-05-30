import fs from "fs"
import path from "path"
import OpenAI from "openai"
import dotenv from "dotenv"

dotenv.config()

/**
 * Assuming that the training & validation datasets have been built from the raw data,
 * this method uploads the training & validation datasets to OpenAI.
 *
 * @returns Object containing OpenAI responses for the training and validation data
 */
export async function uploadData() {
  const trainingSetPath = path.resolve(
    __dirname,
    "..",
    "data",
    "training",
    "medium-training-data.jsonl"
  )
  const validationSetPath = path.resolve(
    __dirname,
    "..",
    "data",
    "training",
    "medium-validation-data.jsonl"
  )

  const trainingData = await uploadFile(trainingSetPath)
  const validationData = await uploadFile(validationSetPath)
  console.log({ trainingData, validationData })
  return { trainingData, validationData }
}

/**
 * Uploads a single file to the OpenAI's file storage.
 *
 * @param path Path to the file that is going to be uploaded
 * @returns an `OpenAI.Files.FileObject` corresponding to the uploaded file
 */
async function uploadFile(path: string) {
  const openai = new OpenAI()
  return await openai.files.create({
    file: fs.createReadStream(path),
    purpose: "fine-tune",
  })
}
