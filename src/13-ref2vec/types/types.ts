export type Artist = {
  internalID: string
  birthday: string
  gender: string
  nationality: string
  name: string
  blurb: string
}

export type Artwork = {
  internalID: string
  colors: string
  medium: string
  rarity: string | null
  saleMessage: string
  slug: string
  title: string
  url: string
}

export type ClassName =
  | "SmallNewTrendingArtworks"
  | "SmallNewTrendingArtists"
  | "Users"

export type Objects = User[] | Artist[] | Artwork[]

export type ReferenceProperty = "likedArtists" | "likedArtworks"

export type User = { id: string; name: string }
