-- vetcode has its own site now; the repository stays in `repo`.
UPDATE projects SET
 url = 'https://vetcode.openyard.cloud',
 updated_at = 1794528000000
WHERE slug = 'vetcode';
