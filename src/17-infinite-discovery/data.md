# How to generate the data

## Quick way to generate the data

## Load the production console

```bash
  hokusai production run --tty 'bin/rails c -- --nomultiline'
```

```ruby
  # assuming you want to generate the data for the artworks in the curators picks collection
  collection = MarketingCollection.find('curators-picks')
  artworks = collection.artworks.published.for_sale
  artworks_json = JSON.pretty_generate(artworks.map do |w|
    {
      id: w.id,
      slug: w.slug,
      title: w.title,
      date: w.date,
      rarity: w.attribution_class,
      medium: w.category,
      materials: w.medium,
      list_price_amount: w.price_listed,
      list_price_currency: w.price_currency,
      categories: w.total_genome.without("Art", "Career Stage Gene").select{ |k,v| k !~ /(galleries based|made in)/i && v == 100}.keys,
      tags: w.tags + w.auto_tags,
      additional_information: w.additional_information,
      image_url: w.default_image.image_urls['large'],
      colors: w.colors,
      artist_name: w.artists.first&.name,
      artist_nationality: w.artists.first&.nationality,
      artist_birthday: w.artists.first&.birthday,
      artist_gender: w.artists.first&.gender,
    }
  end)
  s3_client = S3.new(bucket: "artsy-public")
  s3_client.store_object("curators_picks.json", json, "text/json", "public-read")
```

Download the json file from the
[s3 bucket](https://us-east-1.console.aws.amazon.com/s3/object/artsy-data?region=us-east-1&bucketType=general&prefix=curater_picks.json).

# How to generate the data normally

This documents the Gravity console snippets that were used to generate the
datasets that go into this experiments data directory:

- `17-infinite-discovery/data/artworks.json`

These files are gitignored due to their size and currently live in a shared
drive instead:

- https://drive.google.com/drive/u/1/folders/1Lh7msUc0R_JlpNEzApZ4YbqB8x5tbpws

The files were generated via the following Ruby snippets which were entered
directly into a Gravity Rails console.

## Choose collections

For a large-ish dataset (a few thousand works), select all manually curated
collections:

```ruby
collections = CuratedMarketingCollection.pluck(:id)
```

## Select artworks and their associated artists

```ruby
# artworks
artworks = collections.map{ |id|
  MarketingCollection.find(id).artworks.published.for_sale
}.flatten.uniq.compact
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

We also keep some basic info about the associated artists.

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
    list_price_amount: w.price_listed,
    list_price_currency: w.price_currency,
    categories: w.total_genome.without("Art", "Career Stage Gene").select{ |k,v| k !~ /(galleries based|made in)/i && v == 100}.keys,
    tags: w.tags + w.auto_tags,
    additional_information: w.additional_information,
    image_url: w.default_image.image_urls['large'],
    colors: w.colors,
    artist_name: w.artists.first&.name,
    artist_nationality: w.artists.first&.nationality,
    artist_birthday: w.artists.first&.birthday,
    artist_gender: w.artists.first&.gender,
  }
end)
```
