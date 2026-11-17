export const questionKey = q => `${q.id}@${q.version}`;
export function latestAttempts(attempts) { return new Map(attempts.map(a => [a.questionKey, a])); }
export function shuffled(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
export function selectQuestions(pool, attempts, count, prioritize) {
  const latest = latestAttempts(attempts);
  const ordered = prioritize ? [...shuffled(pool.filter(q => !latest.has(questionKey(q)))), ...shuffled(pool.filter(q => latest.has(questionKey(q))))] : shuffled(pool);
  return ordered.slice(0, count === 'all' ? ordered.length : Number(count));
}
export function validateBank(data) {
  const fail = () => { throw new Error('問題データの形式が正しくありません。管理者に確認してください。'); };
  const str = v => typeof v === 'string' && v.trim().length > 0;
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.categories) || !data.categories.length || !Array.isArray(data.questions) || !data.questions.length) fail();
  if (data.categories.some(c => !c || !str(c.id) || !str(c.name)) || new Set(data.categories.map(c => c.id)).size !== data.categories.length) fail();
  const ids = new Set();
  for (const q of data.questions) {
    if (!q || !str(q.id) || ids.has(q.id) || !data.categories.some(c => c.id === q.category) || !q.id.startsWith(`${q.category}-`) || !Number.isInteger(q.version) || q.version < 1 || !['basic','standard','advanced'].includes(q.difficulty) || !['pilot','approved','draft'].includes(q.status) || q.format !== 'single_choice' || typeof q.passage !== 'string' || ![q.question,q.explanation,q.trap].every(str) || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o,i) => !o || o.id !== 'ABCD'[i] || !str(o.text)) || !'ABCD'.includes(q.answer) || !str(q.answer) || q.answer.length !== 1) fail();
    ids.add(q.id);
    if (q.visual !== null) {
      const v = q.visual;
      if (!v || v.type !== 'table' || !str(v.caption) || !Array.isArray(v.headers) || v.headers.length < 2 || !v.headers.every(str) || !Array.isArray(v.rows) || !v.rows.length || v.rows.some(r => !Array.isArray(r) || r.length !== v.headers.length || !r.every(x => typeof x === 'string' || typeof x === 'number'))) fail();
    }
  }
  return data;
}
