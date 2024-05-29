import { SELECTED_INPUT } from "12-fine-tuning/01-medium"
import OpenAI from "openai"
import dotenv from "dotenv"

dotenv.config()

/**
 * Kicks off a fine-tuning job with the uploaded training and validation datasets.
 * Continues polling for status until the job is complete.
 *
 * @param uploads An object with the references to the uploaded training and validation datasets.
 * @returns A `OpenAI.FineTuning.Jobs.FineTuningJob` with the final state of the fine-tuning job, whether `succeeded`, `failed`, or `cancelled`.
 */
export async function submitFineTuneJob(uploads: {
  trainingData: OpenAI.Files.FileObject
  validationData: OpenAI.Files.FileObject
}) {
  const {
    trainingData: { id: training_file },
    validationData: { id: validation_file },
  } = uploads

  const openai = new OpenAI()
  const fineTune = await openai.fineTuning.jobs.create({
    training_file,
    validation_file,
    model: "gpt-3.5-turbo",
    suffix: SELECTED_INPUT,
  })
  console.log({ fineTune })

  let fineTuneState = await openai.fineTuning.jobs.retrieve(fineTune.id)

  const notDone = (status: typeof fineTuneState.status) => {
    return (
      status !== "succeeded" && status !== "failed" && status !== "cancelled"
    )
  }

  while (notDone(fineTuneState.status)) {
    fineTuneState = await openai.fineTuning.jobs.retrieve(fineTune.id)
    // @ts-expect-error `estimated_finish` is not in the type definition
    const { id, created_at, status, estimated_finish } = fineTuneState

    console.log({
      id,
      created_at: new Date(created_at * 1000),
      status,
      estimated_finish: new Date(estimated_finish * 1000),
    })

    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  return fineTuneState
}
