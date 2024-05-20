/* eslint-disable @typescript-eslint/no-explicit-any */

import { getTextFromHtml } from "./getTextFromHtml"

export type TransformedArticle = {
  metadata: {
    internalID: string
    title: string
    href: string
    publishedAt: string
    byline: string
    vertical: string
    channelName: string
  }
  head: string
  body: string
  text: string
  sections: string[]
}

function getArticleHead(article: any) {
  return `
TITLE: ${article.title}

BYLINE: ${article.byline}

DESCRIPTION: ${article.description}

KEYWORDS: ${article.keywords.join(", ")}
  `.trim()
}

function getArticleBody(article: any) {
  const sections = article.sections
    .filter((s: any) => s.__typename === "ArticleSectionText")
    .map((s: any) => s.body)

  const allSections = sections.join("\n")
  const text = getTextFromHtml(allSections)
  return text
}

function getArticleSections(article: any) {
  const sections = article.sections
    .filter((s: any) => s.__typename === "ArticleSectionText")
    .map((s: any) => s.body)
    .map(getTextFromHtml)

  return sections
}

function getArticleText(article: any) {
  return `
${getArticleHead(article)}

BODY: ${getArticleBody(article)}
  `.trim()
}

function getArticleMetadata(article: any) {
  const {
    internalID,
    title,
    href,
    publishedAt,
    byline,
    keywords,
    vertical,
    channel,
  } = article

  return {
    internalID,
    title,
    href,
    publishedAt,
    byline,
    keywords,
    vertical,
    channelName: channel.name,
  }
}

export function transformArticle(article: any): TransformedArticle {
  return {
    metadata: getArticleMetadata(article),
    head: getArticleHead(article),
    body: getArticleBody(article),
    text: getArticleText(article),
    sections: getArticleSections(article),
  }
}
