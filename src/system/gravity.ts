export async function gravity(
  path: string,
  params: Record<string, unknown> = {},
  headers: Record<string, string> = {}
) {
  const url = new URL(
    `${process.env.GRAVITY_URL ?? "https://stagingapi.artsy.net"}/api/v1/${path}`
  )
  url.search = new URLSearchParams(params as Record<string, string>).toString()

  // console.log(url.toString(), headers)

  const response = await fetch(url.toString(), {
    headers: {
      "Content-type": "application/json",
      ...headers,
    },
  })

  if (!response.ok) {
    const { error, text } = await response.json()
    throw new Error(
      `${response.status} (${response.statusText}) -- ${error}: ${text}`
    )
  }

  return response.json()
}
