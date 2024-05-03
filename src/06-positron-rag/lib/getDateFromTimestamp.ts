export function getDateFromTimestamp(pubDate: string) {
  const dateObject = new Date(pubDate)
  const year = dateObject.getFullYear()
  const month = String(dateObject.getMonth() + 1).padStart(2, "0") // Months are 0-based in JavaScript
  const day = String(dateObject.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
