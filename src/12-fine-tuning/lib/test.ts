import OpenAI from "openai"

// spell-checker:disable
const testCases = {
  "Oil on canvas": "Painting",
  "Stainless steel, painted wood": "Sculpture",
  "Screenprint in colors on Cream Speckletone paper": "Print",
  "Pigment transfer on polylaminate": "Photography",
  "Oil on board, gold frame": "Painting",
  "Canvas, Acrylic, pen, paper, pencil": "Painting",
  "BASF Luran": "Print",
  "Archival pigment print with polymer on Washi paper": "Mixed Media",
}
// spell-checker:enable

export async function assessFineTune({ modelId }: { modelId: string }) {
  const results: AssessmentResult[] = []

  for (const [medium, category] of Object.entries(testCases)) {
    const result = await assessFineTuneCase({ modelId, medium, category })
    results.push(result)
  }

  return results
}

export type AssessmentResult = {
  medium: string
  category: string
  predictedCategory: string
  isCorrect: boolean
}

async function assessFineTuneCase({
  modelId,
  medium,
  category,
}: {
  modelId: string
  medium: string
  category: string
}): Promise<AssessmentResult> {
  const openai = new OpenAI()
  const response = await openai.chat.completions.create({
    model: modelId,
    messages: [
      {
        role: "system",
        content:
          "Identify the medium type based on the provided description of materials",
      },
      { role: "user", content: medium },
    ],
  })
  const predictedCategory = response.choices[0].message.content!
  const isCorrect = predictedCategory === category
  console.log({ medium, category, predictedCategory, isCorrect })
  return { medium, category, predictedCategory, isCorrect }
}

/**
 * Logs out how many of the results were correct.
 *
 * @param results The results of the assessment.
 */
export function summarizeResults(results: AssessmentResult[]) {
  const correct = results.filter((result) => result.isCorrect).length
  const total = results.length
  const accuracy = (correct / total) * 100
  console.log(`\nAccuracy: ${accuracy.toFixed(2)}%`)
}
