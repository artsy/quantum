// yarn tsx src/03-express-app/server.ts

// This file demonstrates how to stream from the server the chunks as
// a new-line separated JSON-encoded stream.

import OpenAI from "openai"
import dotenv from "dotenv"
import express, { Request, Response } from "express"
import cors from "cors"

dotenv.config()
const openai = new OpenAI()
const app = express()

app.use(cors())

app.use(express.text())

app.post("/", async (req: Request, res: Response) => {
  try {
    console.log("Received request BODY:", req.body)

    console.log("Received request Headers:", req.headers)

    res.header("Content-Type", "text/plain")

    const response = await openai.chat.completions.create({
      messages: JSON.parse(req.body),
      model: "gpt-3.5-turbo",
    })

    console.log(JSON.stringify(response.choices[0].message.content))
    res.write(JSON.stringify(response.choices[0].message.content))

    res.end()
  } catch (e) {
    console.error(e)
  }
})

app.listen("3000", () => {
  console.log("Started proxy express server")
})
