# Contributing to the book

The contributor guide for founding teams lives in the book itself, so it can be shared as a link: [`src/contribute.md`](src/contribute.md).

## Adding a contribution

1. Open the city chapter in `src/growth/cities/<city>.md`.
2. Replace the `<div class="contribution-pending">` block under **In their words** with the contribution. Remove the whole block: `scripts/outreach.py` looks for that exact opening tag to tell which stories are still missing. Keep the author's voice, and credit them in a line at the top, for example `*By Mari Luz Garcia*`.
3. Put photos in `src/images/cities/<city>/`, and only use photos the contributor has the right to share.
4. Build with `bash packages/book/scripts/mdbook.sh build` and check the page.

## Outreach

`outreach/` holds the contact tracker and invitation drafts. It is gitignored on purpose: it contains personal correspondence and status notes that shouldn't go into a public repo. Regenerate it with `python3 scripts/outreach.py --reply-by "<date>"` (see the script header). Without `--reply-by`, every draft keeps a `<reply-by date>` placeholder and the script warns you.
