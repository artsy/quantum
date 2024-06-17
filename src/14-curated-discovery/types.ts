export type GravityArtist = {
  id: string
  slug: string
  name: string
  nationality: string
  birthday: string
  deathday: string
  location: string
  hometown: string
  gender: string
  categories: string[]
  blurb: string
}

export type GravityArtwork = {
  id: string
  slug: string
  title: string
  date: string
  rarity: string
  medium: string
  materials: string
  dimensions: string
  price: string
  list_price_amount: number
  list_price_currency: string
  artwork_location: string
  categories: string[]
  tags: string[]
  additional_information: string
  image_url: string
  artist_id: string
  artist_slug: string
  artist_name: string
  artist_nationality: string
  artist_birthday: string
  artist_gender: string
  partner_id: string
  partner_slug: string
  partner_name: string
}

export type GravityArtworkCollection = {
  id: string
  category: string
  description: string
  group: string[]
  image_url: string
  price_guidance: string
  slug: string
  title: string
}

export type User = { id: string; name: string }

export type ClassName = "DiscoveryArtworks" | "DiscoveryUsers"

export type ReferenceProperty = "likedArtworks"
