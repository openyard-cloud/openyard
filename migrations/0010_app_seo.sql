-- Search and share basics for the apps submitted 14-17 Nov: a Vietnamese tagline and
-- description (the pages switch to Vietnamese in the browser), tags where none were given,
-- and a share image rendered with `npm run og`.

UPDATE projects SET
 tagline = '{"en": "Free, open-source motion graphics and visual-effects compositor", "vi": "Công cụ dựng chuyển động và hiệu ứng hình ảnh miễn phí, mã nguồn mở"}',
 description = '{"en": "EffectCraft is a desktop alternative to After Effects for motion graphics, visual effects, and compositing. Build compositions with layers, keyframes, effects, 3D cameras and lights, then render. Alpha software; MIT or Apache-2.0.", "vi": "EffectCraft là phần mềm desktop thay thế After Effects để làm motion graphics, hiệu ứng hình ảnh và compositing. Dựng cảnh bằng layer, keyframe, hiệu ứng, camera và ánh sáng 3D rồi xuất video. Đang ở bản alpha; giấy phép MIT hoặc Apache-2.0."}',
 og = '/og/effectcraft.png'
WHERE slug = 'effectcraft';

UPDATE projects SET
 tagline = '{"en": "A free 3D aquarium for any browser, or a real Windows screensaver", "vi": "Bể cá 3D miễn phí cho mọi trình duyệt, hoặc làm screensaver thật trên Windows"}',
 description = '{"en": "I wanted one fish tank stretched across all my monitors, so I built it. A free 3D aquarium that runs in any browser, nothing to install, no ads, with an octopus who changes colour. Earn Fish Sticks by watching and feeding fish to unlock more. Windows screensaver version: windows.fishtankplus.com", "vi": "Mình muốn một bể cá trải dài trên tất cả màn hình nên đã tự làm. Bể cá 3D miễn phí chạy trên mọi trình duyệt, không cần cài, không quảng cáo, có cả bạn bạch tuộc đổi màu. Ngắm và cho cá ăn để kiếm Fish Sticks, mở khóa thêm cá. Bản screensaver Windows: windows.fishtankplus.com"}',
 tags = '["aquarium", "3d", "screensaver", "relax", "browser"]',
 og = '/og/fish-tank-plus.png'
WHERE slug = 'fish-tank-plus';

UPDATE projects SET
 tagline = '{"en": "Free browser document scanner for clean A4 PDFs.", "vi": "Máy quét tài liệu miễn phí trên trình duyệt, ra file PDF A4 sạch đẹp."}',
 description = '{"en": "LensUp Scanner is a free, browser-based document scanner that turns phone photos into clean, printable PDFs and includes ID-card copy and PDF tools; every tool is free, and the free tools process your files on your device.", "vi": "LensUp Scanner là máy quét tài liệu miễn phí trên trình duyệt, biến ảnh chụp điện thoại thành file PDF sạch, in được, kèm công cụ photo CCCD và công cụ PDF. Mọi công cụ đều miễn phí, và các công cụ miễn phí xử lý file ngay trên máy bạn."}',
 og = '/og/lensup-scanner.png'
WHERE slug = 'lensup-scanner';

UPDATE projects SET
 tagline = '{"en": "Browser-local PDF, image and JSON tools. Files never leave your device.", "vi": "Công cụ PDF, ảnh và JSON chạy ngay trên trình duyệt. File không rời khỏi máy bạn."}',
 description = '{"en": "Lizely is a free set of 800+ browser-local tools: merge or compress PDF, compress images, format JSON, and more. Files stay on your device and are never uploaded. Open a tool, drop in a file, and download the result.", "vi": "Lizely là bộ hơn 800 công cụ miễn phí chạy trên trình duyệt: ghép hoặc nén PDF, nén ảnh, định dạng JSON và nhiều hơn nữa. File nằm trên máy bạn, không bao giờ bị tải lên. Mở công cụ, thả file vào và tải kết quả về."}',
 og = '/og/lizely.png'
WHERE slug = 'lizely';

UPDATE projects SET
 tagline = '{"en": "Free in-browser tools to test mouse buttons, scroll, double-click, CPS, and DPI.", "vi": "Công cụ miễn phí ngay trên trình duyệt để kiểm tra nút chuột, cuộn, double-click, CPS và DPI."}',
 description = '{"en": "Mouse Test Lab is a free set of in-browser tools for checking a computer mouse. It is for PC gamers, people buying a used mouse, and anyone whose mouse has started double-clicking, skipping, or missing buttons.", "vi": "Mouse Test Lab là bộ công cụ miễn phí chạy trên trình duyệt để kiểm tra chuột máy tính. Dành cho game thủ PC, người mua chuột cũ và bất kỳ ai có chuột bị double-click, nhảy cuộn hay mất nút."}',
 og = '/og/mouse-test-lab.png'
WHERE slug = 'mouse-test-lab';

UPDATE projects SET
 tagline = '{"en": "74 free browser tools for files. Nothing leaves your device.", "vi": "74 công cụ xử lý file miễn phí trên trình duyệt. Không gì rời khỏi máy bạn."}',
 description = '{"en": "Free in-browser tools to convert, edit and compress PDFs, images, video and audio, plus text, privacy and everyday utilities. Files never leave your device.", "vi": "Công cụ miễn phí trên trình duyệt để chuyển đổi, chỉnh sửa và nén PDF, ảnh, video, âm thanh, cùng các tiện ích văn bản, quyền riêng tư và việc hằng ngày. File không bao giờ rời khỏi máy bạn."}',
 og = '/og/pispace-tools.png'
WHERE slug = 'pispace-tools';

UPDATE projects SET
 tagline = '{"en": "Free 30-day cigarette taper table, no signup.", "vi": "Bảng giảm thuốc lá dần trong 30 ngày, miễn phí, không cần đăng ký."}',
 description = '{"en": "Enter a typical day''s count and get a 30-day plan that falls in a straight line to a planned zero. No signup. It is a planning table, not a treatment, and a planned zero is not a guaranteed quit.", "vi": "Nhập số điếu bạn hút trong một ngày bình thường và nhận kế hoạch 30 ngày giảm đều đến mốc 0. Không cần đăng ký. Đây là bảng lập kế hoạch, không phải phương pháp điều trị, và mốc 0 theo kế hoạch không đảm bảo bạn sẽ bỏ được."}',
 og = '/og/start-quitting-smoking-calculator.png'
WHERE slug = 'start-quitting-smoking-calculator';

UPDATE projects SET
 tagline = '{"en": "Free in-browser US paycheck & state-tax calculator with official sources.", "vi": "Tính lương thực nhận và thuế bang Mỹ miễn phí trên trình duyệt, kèm nguồn chính thức."}',
 description = '{"en": "StateTaxLab is an independent, free, in-browser US paycheck and state-tax calculator. It is for employees, job-switchers, and anyone who wants to see why a paycheck looks the way it does, not just a single take-home number.", "vi": "StateTaxLab là công cụ độc lập, miễn phí, chạy trên trình duyệt để tính lương và thuế bang ở Mỹ. Dành cho người đi làm, người đổi việc và ai muốn hiểu vì sao phiếu lương trông như vậy, chứ không chỉ một con số thực nhận."}',
 og = '/og/statetaxlab.png'
WHERE slug = 'statetaxlab';

UPDATE projects SET
 tagline = '{"en": "475+ free online tools for PDFs, images, video, developers and writing", "vi": "Hơn 475 công cụ online miễn phí cho PDF, ảnh, video, lập trình và viết lách"}',
 description = '{"en": "ZIPZAX is a collection of 475+ free online tools built by a small self-funded team in Lisbon, Portugal. Merge or compress PDFs, convert and resize images, handle video and audio, use developer utilities, or try 57 free AI tools for writing, summarizing, rewriting and paraphrasing.", "vi": "ZIPZAX là bộ hơn 475 công cụ online miễn phí do một nhóm nhỏ tự bỏ vốn ở Lisbon, Bồ Đào Nha làm ra. Ghép hoặc nén PDF, chuyển đổi và đổi cỡ ảnh, xử lý video và âm thanh, dùng tiện ích cho dev, hoặc thử 57 công cụ AI miễn phí để viết, tóm tắt và diễn đạt lại."}',
 tags = '["pdf", "images", "video", "developer", "ai"]',
 og = '/og/zipzax.png'
WHERE slug = 'zipzax';
