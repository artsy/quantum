This data supports a [force poc](https://github.com/artsy/force/pull/14194) using weaviate to provide real-time recommendation for the onboarding art quiz. Follow these steps to generate.

### Step 1
Generate a list of artworks from our `MarketingCollection`s, follow the steps in src/14-curated-discovery/data.md for artworks.

### Step 2 
Get the art quiz artworks.

```ruby
# In a staging gravity console
Quiz Artworks = ArtQuiz.find_artwork_ids.map{ |id|
  Artworks.find(id)
}.flatten.uniq.compact
```

### Step 3
Normalize the artworks and append the output the `artworks.json` file.

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
    price_min_minor_usd: w.price_min_minor_usd,
    price_max_minor_usd: w.price_max_minor_usd,
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

### Step 4
Upload JSON to https://drive.google.com/drive/folders/13hwE6ysjeSuwa19_3Vx_BwR5rBcUs8fq?usp=drive_link