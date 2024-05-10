import { ARTIST_IDS } from "./artist-ids"

async function main() {
  const artists = await fetchArtists({ size: 100 })
  console.log(artists)
}

main()

async function fetchArtists(args: { size: number }) {
  const query = `query getArtists ($size: Int!, $ids: [String]!) {
    artistsConnection(first: $size, ids: $ids) {
      edges {
        node {
          slug
          blurb
        }
      }
    }
  }
  `

  const variables = {
    size: args.size,
    ids: ARTIST_IDS,
  }

  const headers = {
    "Content-Type": "application/json",
  }

  const response = await metaphysics({ query, variables, headers })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return response.data.artistsConnection.edges.map((edge: any) => edge.node)
}

async function metaphysics(args: {
  query: string
  variables: Record<string, unknown>
  headers: Record<string, string>
}) {
  const { query, variables, headers } = args

  const url = "https://metaphysics-staging.artsy.net/v2"

  const body = JSON.stringify({ query, variables })
  const options = { method: "POST", headers, body }

  const response = await fetch(url, options)
  const json = await response.json()
  return json
}
