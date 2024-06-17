# How to generate the data

This documents the Gravity console snippets that were used to generate the
datasets that go into this experiments data directory:

- `14-curated-discovery/data/artworks.json`
- `14-curated-discovery/data/artists.json`
- `14-curated-discovery/data/partners.json`

These files are gitignored due to their size and currently live in a shared
drive instead:

- https://drive.google.com/drive/u/1/folders/1Lh7msUc0R_JlpNEzApZ4YbqB8x5tbpws

The files were generated via the following Ruby snippets which were entered
directly into a Gravity Rails console.

## Choose collections

For a smaller dataset (a few hundred works), select a handful of collections.
The ones here represent the ones highlighted in the website's global nav, under
the **Artists** dropdown:

```ruby
collections = [
  "curators-picks-blue-chip",
  "curators-picks-emerging",
  "new-from-leading-galleries",
  "new-from-small-galleries",
  "new-from-tastemaking-galleries",
  "new-this-week",
  "trending-now"
]
```

For a larger dataset (a few thousand works), select all manually curated
collections:

```ruby
collections = CuratedMarketingCollection.pluck(:id)
```

## Select artworks and their associated artists and partners

```ruby
# artworks
artworks = collections.map{ |id|
  MarketingCollection.find(id).artworks.published.for_sale
}.flatten.uniq.compact

# artists
artists = artworks.map(&:artists).flatten.uniq.compact

# partners
partners = artworks.map(&:partner).uniq.compact
```

## Serialize the artworks

Here we opt to use collector-facing terminology rather than Artsy internal
jargon, on the assumption that this would perform better with the embedding
models. For example:

- attribution_class → **rarity**
- category → **medium**
- medium → **materials**
- genes → **categories**
- etc.

We also keep some basic info about the associated artists and partners.

We don't necessarily expect to index all of this data onto artworks, but it is
included so that we have the option to do so, or to build up references to
objects in other collections.

```ruby
# artworks json
puts JSON.pretty_generate(artworks.map do |w|
  {
    id: w.id,
    slug: w.slug,
    title: w.title,
    date: w.date,
    rarity: w.attribution_class,
    medium: w.category,
    materials: w.medium,
    dimensions: w.dimensions,
    price: w.sale_message,
    list_price_amount: w.price_listed,
    list_price_currency: w.price_currency,
    artwork_location: w.location&.geocoded_city,
    categories: w.total_genome.without("Art", "Career Stage Gene").select{ |k,v| k !~ /(galleries based|made in)/i && v == 100}.keys,
    tags: w.tags + w.auto_tags,
    additional_information: w.additional_information,
    image_url: w.default_image.image_urls['large'], # 640x640 max

    # artist
    artist_id: w.artists.first&.id,
    artist_slug: w.artists.first&.slug,
    artist_name: w.artists.first&.name,
    artist_nationality: w.artists.first&.nationality,
    artist_birthday: w.artists.first&.birthday,
    artist_gender: w.artists.first&.gender,

    # partner
    partner_id: w.partner&.id,
    partner_slug: w.partner&.slug,
    partner_name: w.partner&.name,
  }
end)
```

## Serialize the artists

As above, we prefer "categories" over genes.

```ruby
# artists json
puts JSON.pretty_generate(artists.map do |a|
  {
    id: a.id,
    slug: a.slug,
    name: a.name,
    nationality: a.nationality,
    birthday: a.birthday,
    deathday: a.deathday,
    location: a.location,
    hometown: a.hometown,
    gender: a.gender,
    categories: a.genome.genes.without("Career Stage Gene", "Art").select{ |k,v| v == 100}.keys,
    blurb: a.blurb,
  }
end)
```

## Serialize the partners

Here again we use "categories" instead of partner_categories. This draws from a
different vocabulary than the gene-based fields do, but it amounts to another
categorization system.

```ruby
# partners json
puts JSON.pretty_generate(partners.map do |p|
  {
    id: p.id,
    slug: p.slug,
    name: p.name,
    verified_artist_ids: VerifiedRepresentative.where(partner: p).map(&:artist).compact.map(&:id),
    categories: p.partner_categories.map(&:name)
  }
end)
```

### Serialize marketing collections

Again, we opt to use collector-facing terminology rather than Artsy internal
jargon, on the assumption that this would perform better with the embedding
models. We also want to be consistent in the field names we use for genes. For
example:

- category → **group**
- genes → **categories**

```ruby
# Get all marketing collections with a description
collections = MarketingCollection.where("description is not null and description <> ''").where(published: true)
```

```ruby
# artworks json
puts JSON.pretty_generate(collections.map do |w|
  {
    id: w.id,
    title: w.title,
    slug: w.slug,
    description: w.description,
    group: w.category,
    price_guidance: w.price_guidance,
    artist_ids: w.artist_ids,
    artwork_ids: w.artwork_ids,
    category:  w.gene_ids.map{ |id| Gene.find(id: "#{id}").name },
    image_url: w.cover_image_url,
  }
end)
```
