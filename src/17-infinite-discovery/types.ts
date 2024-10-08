export type ArtworksClassName = "InfiniteDiscoveryArtworks"

export type GravityArtwork = {
  id: string
  slug: string
  colors: string[]
  title: string
  date: string
  rarity: string
  medium: string
  materials: string
  price: string
  list_price_amount: number
  list_price_currency: string
  categories: string[]
  tags: string[]
  additional_information: string
  image_url: string
  artist_name: string
  artist_nationality: string
  artist_birthday: string
  artist_gender: string
}

export type UsersClassName = "InfiniteDiscoveryUsers"

export type User = { internalID: string; name: string }
