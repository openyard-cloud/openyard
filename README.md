<p align="center"><a href="https://openyard.cloud"><img src="assets/logo.svg" width="96" alt="OpenYard logo"></a></p>
<h1 align="center">OpenYard</h1>

<p align="center"><a href="https://openyard.cloud"><img src="assets/banner.png" alt="OpenYard: free apps, wild ideas, open tools"></a></p>

<p align="center">
  <a href="https://discord.gg/TFKsfh6tMk"><img src="https://img.shields.io/discord/1567359859119231056?label=Discord&logo=discord&logoColor=white&color=5865F2" alt="Discord"></a>
  <a href="https://openyard.cloud"><img src="https://img.shields.io/badge/site-openyard.cloud-111?logo=cloudflare" alt="openyard.cloud"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT"></a>
</p>

**A community for people who make free software: free apps, wild ideas and open tools.**

Three kinds of things grow here: apps for people software forgets, ideas too strange for a startup, and tools for developers. All free.

[openyard.cloud](https://openyard.cloud) · [Discord](https://discord.gg/TFKsfh6tMk) · [Submit a project](https://github.com/openyard-cloud/openyard/issues/new?template=submit-project.yml) · [Introduce yourself](https://github.com/openyard-cloud/openyard/issues/new?template=join-team.yml) · [Discussions](https://github.com/openyard-cloud/openyard/discussions)

OpenYard is a shared yard for people who make free things. You build on your own GitHub or site, then bring your project here to show it off, get feedback, find testers and ask for help. Every project listed on the site lives in this repository as one JSON file, and gets its own page at `openyard.cloud/p/<slug>`.

## Put your project in the yard

Two ways, pick whichever is easier:

1. **No code:** open the [submission form](https://github.com/openyard-cloud/openyard/issues/new?template=submit-project.yml). We add it for you.
2. **Pull request:** add `projects/<slug>.json` and a logo in `projects/logos/`. See [CONTRIBUTING.md](CONTRIBUTING.md). CI checks your file, a maintainer reviews, and it goes live on merge.

There is one rule: **it has to be free to use.** Open source is welcome but not required. Any stage, any stack, any size.

Want `yourproject.openyard.cloud`? Ask in the form.

## Join the community

Share what you are making, ask when you are stuck, help someone else. Developers, designers, translators, testers and people with ideas are all welcome. Come say hi on [Discord](https://discord.gg/TFKsfh6tMk), or [introduce yourself](https://github.com/openyard-cloud/openyard/issues/new?template=join-team.yml).

## Run the site locally

```sh
npm run check    # validate projects/*.json
npm run dev      # build data and serve on http://localhost:8765
```

The site is static and served by Cloudflare Workers: the home page is `public/index.html`, and `scripts/build.mjs` validates the registry and writes `public/projects.json`, the logos, a page per project and `sitemap.xml`. Every push to `main` deploys automatically through Cloudflare Workers Builds.

## Tiếng Việt

OpenYard là cộng đồng của những người làm phần mềm miễn phí. Bạn làm dự án trên GitHub hay trang của mình, rồi mang tới đây để khoe, nhận góp ý, tìm người test và hỏi han khi bí. Luật chỉ có một: dự án phải miễn phí.

Bạn có dự án miễn phí? Điền [biểu mẫu gửi dự án](https://github.com/openyard-cloud/openyard/issues/new?template=submit-project.yml) (không cần biết code), hoặc gửi pull request thêm một file JSON. Muốn trò chuyện thì vào [Discord](https://discord.gg/TFKsfh6tMk) hoặc [giới thiệu bản thân](https://github.com/openyard-cloud/openyard/issues/new?template=join-team.yml).

## License

MIT for the code in this repository. Each listed project keeps its own name, logo and license.
