/*
 * This test aims to experiment with an approach to alleviate position bias when using a model
 * as a ranker with a candidate list by shuffling the order of the candidate list.
 * It was inspired from by a study https://arxiv.org/pdf/2305.08845.pdf, which aims to test
 * the ability of models to be rankers in recommendation systems.
 *
 * NOTE: The below approach is admittedly naive, cost ineffective and not intended to be a viable production solution.
 */

import OpenAI from "openai"
import dotenv from "dotenv"
import chalk from "chalk"
import {
  artworkDescriptions,
  ArtworkDescription,
} from "./02-artwork-descriptions"

dotenv.config()

async function main() {
  const openai = new OpenAI()

  const finalSystemPrompt = `
  Your task is to recommend three artworks from a larger list of recommendation candidates that will be in valid JSON format. You should return the artworks that are most likely to match the user description.

  ONLY include artworks that are for sale. Prefer works that display a price.

  If the user mentions a medium type, such as painting, prints, photography, sculpture, etc, make sure that the medium type of the recommended works match the user's request.

  Avoid recommending multiple works by the same artist UNLESS the user has specifically asked for an artist. In other words, prefer to show three artists artworks by three different artists, unless the user is asking for a specific artist.

  Always include a justification as to why you are recommending each artwork.

  Your output should include three artworks, each with a justification.
  `

  const initialSystemPrompt = `
  Your task is to select the three artworks from a JSON formatted curated list and pick three that are most likely to be of interest to the collector. You ONLY include artworks that are for sale and prioritize works that display a price.

  You respond with three artworks in a valid JSON string and NO markdown formatting NO line breaks.
  `

  const userDescription = `I am a new collector. I want to build my collection by supporting women artists under the age of 40. I have a budget of $5000 per artwork. I prefer paintings and photographs.`

  // ChatGPT will return a valid JSON string with the three recommended artworks on each iteration and concatenate them to this string.
  let result: string = ""

  // NOTE: This defaults to one iteration to prevent high token usage. Be careful of your token when changing the iteration count.
  //       I wouldn't recommend going above 3 iterations.
  for (let i = 0; i < 1; i++) {
    console.log(chalk.yellow(`On iteration: ${i + 1}`))

    const shuffledDescriptions = shuffleArray(artworkDescriptions)

    const response = await openai.chat.completions.create({
      messages: [
        { role: "system", content: initialSystemPrompt },
        {
          role: "user",
          content: userMessageContent(
            userDescription,
            JSON.stringify(shuffledDescriptions)
          ),
        },
      ],
      model: "gpt-4-turbo",
      temperature: 1,
    })

    console.log(
      chalk.yellow(`Iteration response ${i + 1}: `),
      response.choices[0].message.content
    )

    result = result
      ? response.choices[0].message.content!
      : result + "," + response.choices[0].message.content!
  }

  console.log(chalk.green("Result: "), result)

  const finalResponse = await openai.chat.completions.create({
    messages: [
      { role: "system", content: finalSystemPrompt },
      { role: "user", content: userMessageContent(userDescription, result) },
    ],
    model: "gpt-4-turbo",
    temperature: 1,
  })

  console.log(
    chalk.green("Final Result: "),
    finalResponse.choices[0].message.content
  )
}

main()

function shuffleArray(array: ArtworkDescription[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

function userMessageContent(
  userDescription: string,
  artworkDescriptions: string
) {
  return `
    User Description: ${userDescription}

    Artwork Descriptions: ${artworkDescriptions}
  `
}
