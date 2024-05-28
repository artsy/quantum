import { gravity } from "system/gravity"
import { metaphysics, extractNodes } from "system/metaphysics"

export async function getData({
  artworkID,
  userID,
  numMyCollectionArtworks,
}: {
  artworkID: string
  userID: string
  numMyCollectionArtworks: number
}) {
  const data = await metaphysics({
    query: /* GraphQL */ `
      query (
        $numMyCollectionArtworks: Int
        $userID: String!
        $artworkID: String!
      ) {
        artwork(id: $artworkID) {
          ...artwork
          artist {
            blurb
          }
          partner {
            slug
            name
            categories {
              name
            }
          }
          image {
            resized(height: 500, width: 500) {
              url
            }
          }
        }
        user(id: $userID) {
          ...user
        }
      }

      fragment artwork on Artwork {
        slug
        title
        date
        artist {
          name
          formattedNationalityAndBirthday
          categories: genes {
            name
          }
        }
        rarity: attributionClass {
          name
        }
        medium: mediumType {
          name
        }
        materials: medium
        price: saleMessage
      }

      fragment user on User {
        name
        email
        follows {
          genesConnection(first: 20) {
            edges {
              node {
                name
              }
            }
          }
          artistsConnection(first: 20) {
            edges {
              node {
                name
                genes {
                  name
                }
              }
            }
          }
        }
        myCollectionArtworksConnection(first: $numMyCollectionArtworks) {
          edges {
            node {
              ...artwork
            }
          }
        }
      }
    `,

    variables: {
      artworkID,
      userID,
      numMyCollectionArtworks,
    },

    headers: {
      "X-Access-Token": process.env.ADMIN_ACCESS_TOKEN!,
    },
  })

  // console.log(JSON.stringify(data, null, 2))

  function cleanUp(names: { name: string }[]) {
    return names.map((x) => x.name).join("; ")
  }

  // clean up user - follows
  const followGenes = extractNodes(data.user.follows.genesConnection)
  data.user.followedCategories = cleanUp(followGenes)
  delete data.user.follows.genesConnection

  const followArtists = extractNodes(data.user.follows.artistsConnection)
  data.user.followedArtists = followArtists
  delete data.user.follows.artistsConnection

  data.user.followedArtists.forEach((artist) => {
    artist.categories = cleanUp(artist.genes)
    delete artist.genes
  })
  delete data.user.follows

  // clean up user - MyC
  data.user.collectedArtworks = extractNodes(
    data.user.myCollectionArtworksConnection
  )
  data.user.collectedArtworks.forEach((artwork) => {
    artwork.artist.categories = cleanUp(artwork.artist.categories)
    delete artwork.slug
  })
  delete data.user.myCollectionArtworksConnection

  // clean up artwork
  if (data.artwork.artist) {
    data.artwork.artist.categories = cleanUp(
      data.artwork.artist.categories || []
    )
  }

  // clean up partner
  data.artwork.partner.categories = cleanUp(data.artwork.partner.categories)

  const { user: userData, artwork: artworkArtistPartnerData } = data
  const { artist, partner, ...artwork } = artworkArtistPartnerData
  const { collectedArtworks, ...user } = userData

  // enrich artwork with partner applied categories
  const { genes: pacs } = await gravity(
    `partner/${partner.slug}/artwork/${artwork.slug}/genome`,
    {},
    { "X-Access-Token": process.env.ADMIN_ACCESS_TOKEN! }
  )
  artwork.categories = Object.keys(pacs).join("; ")

  // console.log({ artwork, partner, artist, user, collectedArtworks })
  return { artwork, partner, artist, user, collectedArtworks }
}

export async function getPartnerAppliedGene(name: string) {
  const allPartnerAppliedGenes = await gravity(
    `genes/partner_applied`,
    {},
    {
      "X-Access-Token": process.env.ADMIN_ACCESS_TOKEN!,
    }
  )

  const gene = allPartnerAppliedGenes.find((gene) => gene.name === name)
  return gene
}
