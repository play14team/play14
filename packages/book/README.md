# play14-book

*#play14, the story: organically growing a global community.*

An [mdBook](https://rust-lang.github.io/mdBook/) telling how #play14 started, how it grew, how the mentoring program works, and what makes it special.

## Commands

Run from the repo root:

```bash
bun --filter play14-book dev     # serve with live reload on http://localhost:3000
bun --filter play14-book build   # render static HTML into packages/book/book/
bun --filter play14-book test    # compile and test code samples, if any
bun --filter play14-book clean   # remove the build output
bun --filter play14-book outreach  # draft invitations to founding teams (see CONTRIBUTING.md)
```

You don't need to install mdBook. `scripts/mdbook.sh` downloads a pinned release (`MDBOOK_VERSION`) for your platform into `.bin/` on first use. Linux and macOS on x86_64 and arm64 are supported. Anywhere else, run `cargo install mdbook`.

The `dev` server uses mdBook's default port 3000, the same as the web app. If both are running, pass a different port: `bash scripts/mdbook.sh serve -p 3100`.

## Layout

```
book.toml          # metadata and HTML output settings
theme/play14.css   # brand colors on top of the stock mdBook themes
src/SUMMARY.md     # table of contents; mdBook builds only what is listed here
src/beginnings/    # Part 1: how it started
src/growth/        # Part 2: how we grew
src/mentoring/     # Part 3: the mentoring program
src/special/       # Part 4: what makes #play14 special, the 14 words
```

## License

The book's text and images are licensed under [CC BY 4.0](LICENSE.md). The scripts are MIT, like the rest of the repository.

## Sources

- The "Our story" timeline: the `history` single type in Strapi, shown at play14.org/about/story
- The 14 words: Cédric's GamiCon 38 talk *#play14 in 14 words* (March 14th, 2026), slides and speaker notes
- Mentoring and hosting rules: `packages/web/content/hosting/en.mdx`
- Event counts, cities, countries, hosts and mentors: the `event`, `event-location` and `player` collections in production Strapi, as of October 2026
- Personal memories (the name, the 2018–2019 mentoring rule, the foreword): Cédric

Any open gaps for the author are marked with `<!-- TODO(author): … -->` comments. They don't appear in the rendered book. List them with:

```bash
grep -rn "TODO(author)" packages/book/src
```
