interface Args {
  /** GraphQL query */
  query: string

  /** GraphQL variables */
  variables: Record<string, unknown>

  /**
   * HTTP Headers
   *
   * If additional headers such as `X-Access-Token` or `X-XApp-Token` are required,
   * provide them here.
   *
   */
  headers: Record<string, string>
}

/**
 * Helper to make a request to Metaphysics
 */

export async function metaphysics(args: Args) {
  const { query, variables } = args

  // build query
  const url = `${process.env.METAPHYSICS_URL ?? "https://metaphysics-staging.artsy.net"}/v2`
  const headers = {
    "Content-Type": "application/json",
    ...args.headers,
  }
  const body = JSON.stringify({ query, variables })
  const options = { method: "POST", headers, body }

  // fetch response
  const response = await fetch(url, options)

  // handle errors, if any
  if (!response.ok) {
    throw new Error(
      `Network error: ${response.status} — ${response.statusText}`
    )
  }

  const { data, errors } = await response.json()

  if (errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(errors)}`)
  }

  // respond with data
  return data
}

/**
 * Helper to extract nodes from a connection
 */

export function extractNodes<T>(connection: { edges: { node: T }[] }) {
  return connection.edges.map((edge) => edge.node)
}
