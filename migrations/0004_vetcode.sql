-- vetcode: security check skill (OpenYard team project).
INSERT INTO projects (slug, name, type, kinds, status, tagline, description, url, repo, license, logo, logo_style, image, og, color, maintainers, tags, team, featured, swarm, added, created_at, updated_at) VALUES
('vetcode', 'vetcode', 'open-source', '["dev"]', 'beta',
 '{"en":"Security check for your code, before you trust it","vi":"Kiểm tra bảo mật code trước khi tin dùng"}',
 '{"en":"An AI skill that checks apps, websites and servers for malware, supply-chain attacks, leaked secrets and vulnerabilities, then confirms each finding by reading the code. Use it on your own project before you ship, or on someone else''s repo, package or MCP server before you install it. Free, open source, runs on your machine.","vi":"Skill AI kiểm tra app, web và server để tìm mã độc, tấn công chuỗi cung ứng, secret bị lộ và lỗ hổng, rồi đọc code để xác nhận từng phát hiện. Dùng cho dự án của bạn trước khi phát hành, hoặc cho repo, package, MCP server của người khác trước khi cài. Miễn phí, mã nguồn mở, chạy trên máy bạn."}',
 'https://github.com/openyard-cloud/vetcode', 'https://github.com/openyard-cloud/vetcode', 'MIT',
 '/logos/vetcode.svg', 'tile', '/images/vetcode.webp', '/og/vetcode.png', '#0d9488',
 '["thihodev"]', '["security","claude-skill","developer-tools"]', 1, 1, '{"src":"/logos/vetcode.svg"}',
 '2026-11-05', 1793836800000, 1793836800000);
