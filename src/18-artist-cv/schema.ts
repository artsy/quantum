import { z } from "zod"

export const schema = z
  .object({
    artistName: z.string().describe("Artist's name"),
    education: z.array(
      z
        .object({
          year: z.number().describe("Year of completion"),
          degree: z.string().describe("Degree attained"),
          institution: z.string().describe("Name of the institution"),
          location: z
            .string()
            .describe(
              "Location of the institution, normalized to city, state (if USA) and ISO 2-letter country code, e.g. 'New York, NY, US' or 'London, UK'"
            ),
        })
        .describe("A list of educational experiences and degrees")
        .partial()
    ),
    exhibitions: z.array(
      z
        .object({
          year: z.number().describe("Year of exhibition"),
          title: z.string().describe("Title of the exhibition"),
          exhibitionType: z
            .enum(["solo", "duo", "group", "unknown"])
            .describe("Type of exhibition (solo, duo or group show)"),
          venue: z
            .string()
            .describe("Name of the exhibition venue (gallery, museum, etc)"),
          location: z.string().describe("Location of the venue"),
        })
        .describe(
          "A list of exhibitions the artist has participated in, or else an empty array"
        )
        .partial()
    ),
  })
  .partial()
