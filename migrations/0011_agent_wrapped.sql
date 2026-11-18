-- agent-wrapped: your year with Claude Code, Spotify Wrapped style (OpenYard team project).
-- Its site is https://wrapped.openyard.cloud; the repository is in `repo`.
INSERT INTO projects (slug, name, type, kinds, status, tagline, description, url, repo, license, logo, logo_style, image, og, color, maintainers, tags, team, featured, swarm, added, created_at, updated_at, install) VALUES
('agent-wrapped', 'agent-wrapped', 'open-source', '["dev"]', 'beta',
 '{"en":"Your year with Claude Code, Spotify Wrapped style","vi":"Một năm của bạn với Claude Code, kiểu Spotify Wrapped"}',
 '{"en":"One command turns the Claude Code history already on your computer into a short story you tap through: active days, your year as a heatmap, every model you used and when it arrived, the hours you work and your longest session. The last slide is a card you can save and post. Nothing is uploaded, and the card shows totals only: no prompts, no file names, no project names.","vi":"Một lệnh biến lịch sử Claude Code có sẵn trên máy bạn thành một câu chuyện ngắn để bấm qua: số ngày làm việc, cả năm dưới dạng bản đồ nhiệt, các model bạn đã dùng và ngày mỗi model xuất hiện, giờ bạn hay làm và phiên dài nhất. Slide cuối là một thẻ để lưu và đăng lên mạng. Không gửi dữ liệu đi đâu, và thẻ chỉ có số tổng: không prompt, không tên file, không tên dự án."}',
 'https://wrapped.openyard.cloud', 'https://github.com/openyard-cloud/agent-wrapped', 'MIT',
 '/logos/agent-wrapped.svg', 'tile', '/images/agent-wrapped.webp', NULL, '#14171c',
 '["thihodev"]', '["claude-code","wrapped","developer-tools"]', 1, 1, NULL,
 '2026-11-18', 1794960000000, 1794960000000,
 '[{"label":{"en":"Claude Code","vi":"Claude Code"},"cmd":"npx github:openyard-cloud/agent-wrapped","note":{"en":"Runs straight from the GitHub repository. Needs Node 18 or newer. Add --demo to see it with made-up data.","vi":"Chạy thẳng từ repo GitHub. Cần Node 18 trở lên. Thêm --demo để xem với dữ liệu mẫu."}}]');
