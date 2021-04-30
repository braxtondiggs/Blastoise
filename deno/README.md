# Blastoise ![Blastoise](../cryptonym.png)

Grab all brewery(or anything else) locations from your [Google Location History](https://support.google.com/accounts/answer/3118687).
### Prerequisites
- [Deno](https://deno.land/)
- [Your Location History](https://takeout.google.com/settings/takeout)

### Running Application

1. Replace `Location History` folder with your Location History filled with json data.

2. Run `deno run -A src/condense.ts` to combine all json files and compress all duplicate locations

3. Run `deno run -A src/search.ts` to find all breweries in your data set