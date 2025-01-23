# Extracting artist CV data

This directory contains experiments in extracting structured data from PDF
artist CVs through the use of multimodal LLMS

**01-anthropic** — First attempt, uses the Anthropic SDK directly.

**02-generic** — Uses the Vercel AI SDK, to make it easy to swap models
(currently OpenAI and Anthropic) and stay vendor-neutral in theory.

**03-bedrock** — Because staying vendor neutral is easier said than done, I had
to use Amazon's SDK to try out an open-weights Llama vision model.
