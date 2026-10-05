# #play14, the story

*#play14, the story: organically growing a global community.*

An [mdBook](https://rust-lang.github.io/mdBook/) telling how #play14 started, how it grew, how the mentoring program works, and what makes it special.

## Commands

Run from the repo root:

```bash
bun run book                                        # same as: bash packages/book/scripts/mdbook.sh serve --open (http://localhost:3100)
bash packages/book/scripts/mdbook.sh build          # render static HTML into packages/book/book/
bash packages/book/scripts/mdbook.sh clean          # remove the build output
python3 packages/book/scripts/outreach.py           # draft invitations to founding teams (see CONTRIBUTING.md)
```

The book is deliberately **not** a Bun workspace package (it has no `package.json`). Registering it would change the root `package.json` and `bun.lock`, and any PR touching those redeploys staging.

You don't need to install mdBook. `scripts/mdbook.sh` downloads a pinned release (`MDBOOK_VERSION`) for your platform into `.bin/` on first use. Linux and macOS on x86_64 and arm64 are supported. Anywhere else, run `cargo install mdbook`.

`serve` uses port 3100 so it never clashes with the web app on 3000. Pass `-p <port>` to use another one.

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
