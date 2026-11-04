# Contributing to OpenYard

## Add a project

Use the form at [openyard.cloud/submit](https://openyard.cloud/submit). No account, no pull request: paste your GitHub link to fill in the details, add a screenshot if you have one, and send. The project is live right away with its own page, and you get a private link to edit or remove it.

The only rule is that it is free to use. Maintainers hide listings that are not free, or that harm their users.

### For maintainers

Projects live in the `openyard` D1 database. Hide or show one, or mark it as a team project:

```sh
npx wrangler@4 d1 execute openyard --remote --command "UPDATE projects SET hidden = 1 WHERE slug = 'some-slug'"
npx wrangler@4 d1 execute openyard --remote --command "UPDATE projects SET team = 1, featured = 1 WHERE slug = 'some-slug'"
```

`npm run og <slug>` renders a share card to `public/og/<slug>.png` and prints the command that points the project at it.

## Work on the site

The home page (`public/index.html`) and the submit form (`public/submit.html`) are plain HTML, CSS and JavaScript. `src/worker.js` serves the API, project pages (template in `src/pages.js`), the sitemap and the GitHub stats cron. Run `npm run dev`, check light and dark mode, English and Vietnamese, and a narrow window before opening a pull request.

## Pull requests made with AI

AI agents are welcome here; OpenYard is built with them. A person still answers for every pull request:

- Open it from an account a person reads, and reply to review comments yourself.
- Say in the description which tool you used and what you checked by hand. For changes you can see, add a screenshot (narrow and wide, light and dark).
- Keep it to the issue. Do not add test harnesses, dependencies or workflow changes that the issue did not ask for.
- One open pull request per issue. If someone is already on it, help there instead.

Maintainers may close pull requests that look generated in bulk without this, however correct the code is.

## Be kind

Read the [Code of Conduct](CODE_OF_CONDUCT.md). To report a security problem, see [SECURITY.md](SECURITY.md).
