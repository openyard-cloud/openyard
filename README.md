<p align="center"><a href="https://openyard.cloud"><img src="assets/logo.svg" width="96" alt="OpenYard logo"></a></p>
<h1 align="center">OpenYard</h1>

<p align="center"><a href="https://openyard.cloud"><img src="assets/banner.png" alt="OpenYard: free apps, wild ideas, open tools"></a></p>

<p align="center">
  <a href="https://discord.gg/TFKsfh6tMk"><img src="https://img.shields.io/discord/1567359859119231056?label=Discord&logo=discord&logoColor=white&color=5865F2" alt="Discord"></a>
  <a href="https://openyard.cloud"><img src="https://img.shields.io/badge/site-openyard.cloud-111?logo=cloudflare" alt="openyard.cloud"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT"></a>
</p>

**A community for people who make free software: free apps, wild ideas and open tools.**

[openyard.cloud](https://openyard.cloud) · [Discord](https://discord.gg/TFKsfh6tMk) · [Submit a project](https://openyard.cloud/submit) · [Introduce yourself](https://github.com/openyard-cloud/openyard/issues/new?template=join-team.yml) · [Discussions](https://github.com/openyard-cloud/openyard/discussions)

OpenYard is a shared yard for people who make free things. You build on your own GitHub or site, then bring your project here to show it off, get feedback, find testers and ask for help. Every project gets its own page at `openyard.cloud/p/<slug>` with its GitHub stars, pull requests, issues and discussions, and the busiest ones rise to the top of Trending.

## Put your project in the yard

Fill in the form at **[openyard.cloud/submit](https://openyard.cloud/submit)**. No account needed: paste your GitHub link to fill it in, send it, and your project is live right away. You get a private link to edit or remove it later.

There is one rule: **it has to be free to use.** Open source is welcome but not required. Any stage, any stack, any size.

Want `yourproject.openyard.cloud`? Ask on [Discord](https://discord.gg/TFKsfh6tMk).

## Every repository gets a code check

Projects with a GitHub repository are read by [vetcode](https://github.com/openyard-cloud/vetcode) and checked again whenever their code changes. Nothing is installed or run. The project page then shows:

- **What the code can do.** Whether it reads secrets, connects to the internet, starts other programs, reads user and machine details, writes to startup folders, or builds code while it runs. This is a label read from the code itself, not written by the maker.
- **Abilities that are new since the previous check.** An update that suddenly gains network access or starts reading secrets is how hijacked packages usually show up.
- **Malware and supply-chain findings**, with links to the exact lines. Vulnerability candidates and leaked-secret locations are never published, so nobody is pointed at an unfixed problem.
- **What the project asks vetcode to skip**, so nothing can be hidden quietly.

Anyone can do the same for **any public GitHub repository** at [openyard.cloud/check](https://openyard.cloud/check): paste a link and the result appears in a minute or two, at a page that stays, such as `openyard.cloud/check/expressjs/express`, with its own badge at `/badge/gh/<owner>/<repo>.svg`. The site asks the scanner workflow through a `repository_dispatch` (the `DISPATCH_TOKEN` Worker secret, a fine-grained token with Contents read and write on this repository); without it, waiting checks are picked up by the six-hourly run.

Makers can add the result to their README:

```markdown
[![OpenYard code check](https://openyard.cloud/badge/<slug>.svg)](https://openyard.cloud/p/<slug>#check)
```

The checks run in [`.github/workflows/vet.yml`](.github/workflows/vet.yml) with [`scripts/vet.mjs`](scripts/vet.mjs), which posts each result with the `VET_TOKEN` secret (set the same value in GitHub Actions and with `npx wrangler secret put VET_TOKEN`).

## Join the community

Share what you are making, ask when you are stuck, help someone else. Developers, designers, translators, testers and people with ideas are all welcome. Come say hi on [Discord](https://discord.gg/TFKsfh6tMk), or [introduce yourself](https://github.com/openyard-cloud/openyard/issues/new?template=join-team.yml).

## Run the site locally

```sh
npm run dev      # local database with the seed projects, on http://localhost:8787
npm run check    # syntax check
```

One Cloudflare Worker serves everything: static files from `public/` (home page, submit form), and from `src/worker.js` the API, project pages, sitemap and a cron trigger that refreshes GitHub stats. Projects live in a D1 database (`migrations/`). Every push to `main` deploys through Cloudflare Workers Builds; run `npm run migrate` after adding a migration. An optional `GITHUB_TOKEN` secret raises GitHub's rate limit and adds discussions to project pages.

## Tiếng Việt

OpenYard là cộng đồng của những người làm phần mềm miễn phí. Bạn làm dự án trên GitHub hay trang của mình, rồi mang tới đây để khoe, nhận góp ý, tìm người test và hỏi han khi bí. Luật chỉ có một: dự án phải miễn phí.

Bạn có dự án miễn phí? Điền form tại [openyard.cloud/submit](https://openyard.cloud/submit): không cần tài khoản, gửi xong là có mặt trên OpenYard ngay.

Mọi dự án có repo GitHub đều được vetcode đọc (không chạy) và kiểm tra lại mỗi khi code thay đổi. Trang dự án hiện code đó làm được gì (đọc secret, dùng mạng, chạy chương trình khác…), khả năng nào mới xuất hiện so với lần trước, và các dấu hiệu mã độc nếu có.

## License

MIT for the code in this repository. Each listed project keeps its own name, logo and license.
