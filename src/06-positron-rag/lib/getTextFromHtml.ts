import { load } from "cheerio"

export function getTextFromHtml(html: string) {
  const $ = load(html)
  const text = $("p, li") // TODO: what selectors to use?
    .map((i, el) => $(el).text())
    .get()
    .join("\n\n")
  return text
}
