<p align="center"><a href="https://openyard.cloud"><img src="assets/logo.svg" width="96" alt="OpenYard logo"></a></p>
<h1 align="center">OpenYard</h1>

<p align="center"><a href="https://openyard.cloud"><img src="assets/banner.png" alt="OpenYard: free apps, built by people and AI"></a></p>

<p align="center">
  <a href="https://discord.gg/TFKsfh6tMk"><img src="https://img.shields.io/discord/1567359859119231056?label=Discord&logo=discord&logoColor=white&color=5865F2" alt="Discord"></a>
  <a href="https://openyard.cloud"><img src="https://img.shields.io/badge/site-openyard.cloud-111?logo=cloudflare" alt="openyard.cloud"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT"></a>
</p>

**Free apps and open-source tools, built by people and AI, for people software forgets.**

[openyard.cloud](https://openyard.cloud) · [Discord](https://discord.gg/TFKsfh6tMk) · [Submit a project](https://github.com/openyard-cloud/openyard/issues/new?template=submit-project.yml) · [Join the team](https://github.com/openyard-cloud/openyard/issues/new?template=join-team.yml) · [Discussions](https://github.com/openyard-cloud/openyard/discussions)

OpenYard is a shared yard: a small team builds free apps with AI agents, and anyone can bring their own free or open-source project to sit next to ours. Every project listed on the site lives in this repository as one JSON file.

## Put your project in the yard

Two ways, pick whichever is easier:

1. **No code:** open the [submission form](https://github.com/openyard-cloud/openyard/issues/new?template=submit-project.yml). We add it for you.
2. **Pull request:** add `projects/<slug>.json` and a logo in `projects/logos/`. See [CONTRIBUTING.md](CONTRIBUTING.md). CI checks your file, a maintainer reviews, and it goes live on merge.

What we list:

- Free to use (no paywall on core features) **or** open source with a license.
- Works today, or is close to launch.
- Someone maintains it, and you are that someone or have their permission.
- No selling user data, no tracking ads.

Want `yourproject.openyard.cloud`? Ask in the form.

## Join the team

Developers, designers, translators, testers and people with a problem worth solving are all welcome. Come say hi on [Discord](https://discord.gg/TFKsfh6tMk), or fill in the [join form](https://github.com/openyard-cloud/openyard/issues/new?template=join-team.yml).

## Run the site locally

```sh
npm run check    # validate projects/*.json
npm run dev      # build data and serve on http://localhost:8765
```

The site is a single static page (`public/index.html`) served by Cloudflare Workers. `scripts/build.mjs` validates the registry and writes `public/projects.json` plus the logos. Pushes to `main` deploy automatically when the `CLOUDFLARE_API_TOKEN` secret is set.

## Tiếng Việt

OpenYard là khoảng sân chung: một nhóm nhỏ dùng AI để làm app miễn phí, và ai cũng có thể đưa dự án miễn phí hoặc mã nguồn mở của mình lên đây. Gửi dự án qua [form](https://github.com/openyard-cloud/openyard/issues/new?template=submit-project.yml) (không cần biết code) hoặc mở pull request thêm một file JSON. Muốn tham gia nhóm thì vào [Discord](https://discord.gg/TFKsfh6tMk) hoặc điền [form tham gia](https://github.com/openyard-cloud/openyard/issues/new?template=join-team.yml).

## License

MIT for the code in this repository. Each listed project keeps its own name, logo and license.
