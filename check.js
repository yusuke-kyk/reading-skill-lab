import {questionKey, shuffled, validateBank} from './quiz.js';
export const CHECK_KEY = 'reading-skill-lab:checks:v1';
export function createCheckPlan(questions, categories, attempts) {
  if (categories.length !== 7) throw new Error('読解力チェックには7分野が必要です。');
  const tried = new Set(attempts.map(a => a.questionKey));
  const selected = [];
  let balanced = true;
  const prioritize = pool => [...shuffled(pool.filter(q => !tried.has(questionKey(q)))), ...shuffled(pool.filter(q => tried.has(questionKey(q))))];
  for (const category of categories) {
    const pool = questions.filter(q => q.category === category.id && q.status !== 'draft');
    if (pool.length < 3) throw new Error('各分野に3問以上の問題が必要です。');
    const group = [];
    for (const difficulty of ['basic','standard','advanced']) {
      const q = prioritize(pool.filter(q => q.difficulty === difficulty))[0];
      if (q) group.push(q); else balanced = false;
    }
    group.push(...prioritize(pool.filter(q => !group.includes(q))).slice(0,3-group.length));
    selected.push(...group);
  }
  return {questions:shuffled(selected), reference:selected.some(q => tried.has(questionKey(q))), balanced};
}
export function checkSummary(result) {
  const categories = result.categories.map(c => {
    const answers = result.answers.filter(a => a.q.category === c.id);
    return {...c,total:answers.length,correct:answers.filter(a => a.isCorrect).length};
  });
  return {correct:result.answers.filter(a => a.isCorrect).length, categories,
    recommendations:[...categories].filter(c => c.correct < c.total).sort((a,b) => a.correct-b.correct).slice(0,2)};
}
export function validateCheck(result) {
  if (!result || typeof result.sessionId !== 'string' || !result.sessionId || typeof result.completedAt !== 'string' || Number.isNaN(Date.parse(result.completedAt)) || typeof result.reference !== 'boolean' || typeof result.balanced !== 'boolean' || !Array.isArray(result.answers) || result.answers.length !== 21 || !Array.isArray(result.categories) || result.categories.length !== 7) throw new Error('完了した21問の結果ではありません。');
  validateBank({schemaVersion:1,categories:result.categories,questions:result.answers.map(a => a.q)});
  if (result.answers.some(a => !['A','B','C','D'].includes(a.selected) || typeof a.isCorrect !== 'boolean' || a.isCorrect !== (a.selected === a.q.answer)) || checkSummary(result).categories.some(c => c.total !== 3)) throw new Error('チェック結果の形式が正しくありません。');
  return result;
}
export function completeCheck(session, categories) {
  return validateCheck({sessionId:session.id, completedAt:new Date().toISOString(), reference:session.reference, balanced:session.balanced, categories, answers:session.answers});
}
export class CheckRepository {
  constructor(provider = () => globalThis.localStorage) {
    this.results = []; this.warning = ''; this.storage = null;
    this.storageProvider = provider;
    try {
      this.storage = provider();
      const raw = this.storage.getItem(CHECK_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('invalid');
        parsed.forEach(validateCheck); this.results = parsed;
      }
    } catch { this.storage = null; this.warning = '保存されたチェック結果を読み込めません。一時的にチェックを利用できます。'; }
  }
  resetResults() {
    try {
      const storage = this.storage || this.storageProvider();
      storage.removeItem(CHECK_KEY);
      this.storage = storage; this.warning = ''; this.results = [];
      return true;
    } catch {
      this.warning = '保存済みチェック結果を削除できませんでした。結果は保持しています。ブラウザーの保存設定を確認し、もう一度お試しください。';
      return false;
    }
  }
  getResults() { return structuredClone(this.results); }
  save(result) {
    validateCheck(result);
    if (this.results.some(r => r.sessionId === result.sessionId)) return;
    this.results.push(structuredClone(result));
    try {
      if (!this.storage) throw new Error('unavailable');
      this.storage.setItem(CHECK_KEY,JSON.stringify(this.results));
    } catch { this.warning = 'チェック結果を保存できませんでした。この画面で結果を確認できますが、再読み込みすると失われる可能性があります。'; }
  }
}
