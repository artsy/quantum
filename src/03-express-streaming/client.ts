/**
 * Usage examples:
 *
 * yarn tsx src/03-express-app/client.ts "I want to purchase art with a budget of 5,000. I am especially interested in photography. Please provide some recommendations."
 */

/**
 * This file is intended be run from the command-line with Node
 * for easy demo purposes, but simulating use in the browser.
 *
 * To run it in a browser application, copy/paste it into a frontend application,
 * remove the 'node-fetch' import, and replace `process.stdout.write` with
 * a console.log or UI display.
 */
import fetch from "node-fetch"
import { ChatCompletionStream } from "openai/lib/ChatCompletionStream"

const input = process.argv.slice(2).join(" ")

fetch("http://localhost:3000", {
  method: "POST",
  body: input,
  headers: { "Content-Type": "text/plain" },
}).then(async (res) => {
  // @ts-expect-error ReadableStream on different environments can be strange
  const runner = ChatCompletionStream.fromReadableStream(res.body)

  runner.on("content", (delta) => {
    process.stdout.write(delta)
    // or, in a browser, you might display like this:
    // document.body.innerText += delta; // or:
    // document.body.innerText = snapshot; add snapshot as second argument to on('content') if needed
  })

  console.dir(await runner.finalChatCompletion(), { depth: null })
})
