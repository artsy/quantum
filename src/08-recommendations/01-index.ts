import OpenAI from "openai"
import dotenv from "dotenv"
import chalk from "chalk"
import { artworkDescriptions } from "./01-artwork-descriptions"

dotenv.config()

async function main() {
  const openai = new OpenAI()

  const systemPrompt = `
    Your task is to recommend three artworks from a larger list of recommendation candidates. You should return the artworks that are most likely to match the user description. ONLY include artworks that are for sale. Prefer works that display a price.

    Always make sure that the medium type matches the user's request.

    Always include a justification as to why you are recommending each artwork. 

    Your output should include the artwork title, details as well as a one to two sentence description as to why this artwork matches the user's description.
  `
  const userDescription = `I am a collector who is interested in paintings made from unusual materials in earth-toned colors.`

  const userMessage = `
  <userDescription>
    ${userDescription}
  </userDescription>

  <artworkDescriptions>
    ${artworkDescriptions}
  </artworkDescriptions>
  `

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ]

  const response = await openai.chat.completions.create({
    messages: messages,
    model: "gpt-4-turbo",
    temperature: 0,
  })

  console.log(
    chalk.yellow("Response from openai: "),
    response.choices[0].message.content
  )
}

main()
