# Quantum

Experiments with large language models (LLMs)

This repo serves as a common home for Typescript-centric but vendor- and
model-agnostic experiments with LLMs.

This project is not meant to be built or deployed, but rather to be run locally
with commands such as:

```sh
yarn tsx src/00-my-experiment/index.ts
```

## Meta

- **State:** experimental
- **GitHub:**
  [https://github.com/artsy/quantum](https://github.com/artsy/quantum)
- **Point People:** [@anandaroop](https://github.com/anandaroop),
  [@mc-jones](https://github.com/mc-jones)

## Setup

Clone:

```sh
git clone git@github.com:artsy/quantum.git
cd quantum
```

Install tool versions:

```sh
asdf install
```

Install dependencies:

```sh
yarn install
```

Set up environment:

```sh
cp .env.example .env
```

## Contributing

Add new experiments under [/src](src/), following the existing folder naming
conventions.

No need to compile Typescript source files, just run them directly with `tsx` as
follows:

```sh
yarn tsx src/00-my-experiment/index.ts
```
