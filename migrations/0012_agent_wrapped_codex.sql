-- agent-wrapped now reads Codex too.
UPDATE projects SET
 tagline = '{"en":"Your year with Claude Code and Codex, Spotify Wrapped style","vi":"Một năm của bạn với Claude Code và Codex, kiểu Spotify Wrapped"}',
 description = '{"en":"One command turns the Claude Code and Codex history already on your computer into a short story you tap through: active days, your year as a heatmap, every model you used and when it arrived, the hours you work and your longest session. Use both agents and you get one card for the two. The last slide is a card you can save and post. Nothing is uploaded, and the card shows totals only: no prompts, no file names, no project names.","vi":"Một lệnh biến lịch sử Claude Code và Codex có sẵn trên máy bạn thành một câu chuyện ngắn để bấm qua: số ngày làm việc, cả năm dưới dạng bản đồ nhiệt, các model bạn đã dùng và ngày mỗi model xuất hiện, giờ bạn hay làm và phiên dài nhất. Dùng cả hai agent thì được một thẻ chung. Slide cuối là một thẻ để lưu và đăng lên mạng. Không gửi dữ liệu đi đâu, và thẻ chỉ có số tổng: không prompt, không tên file, không tên dự án."}',
 install = '[{"label":{"en":"Claude Code or Codex","vi":"Claude Code hoặc Codex"},"cmd":"npx github:openyard-cloud/agent-wrapped","note":{"en":"Runs straight from the GitHub repository. Needs Node 18 or newer. Add --demo to see it with made-up data.","vi":"Chạy thẳng từ repo GitHub. Cần Node 18 trở lên. Thêm --demo để xem với dữ liệu mẫu."}}]',
 tags = '["claude-code","codex","wrapped","developer-tools"]',
 updated_at = 1795003200000
WHERE slug = 'agent-wrapped';
