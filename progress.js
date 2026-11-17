export const STORAGE_KEY = 'reading-skill-lab:progress:v1';
const valid = a => a && typeof a.questionKey === 'string' && typeof a.category === 'string' && /^[ABCD]$/.test(a.selected) && typeof a.isCorrect === 'boolean' && typeof a.answeredAt === 'string' && !Number.isNaN(Date.parse(a.answeredAt)) && typeof a.sessionId === 'string';
export class ProgressRepository {
  constructor(storageProvider = () => globalThis.localStorage) {
    this.attempts = []; this.warning = ''; this.storage = null;
    try {
      this.storage = storageProvider();
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.every(valid)) throw new Error('corrupt');
        this.attempts = parsed;
      }
    } catch {
      this.warning = '履歴を読み込めませんでした。この画面での学習は続けられます。履歴が壊れているか、保存が無効になっています。';
      this.storage = null;
    }
  }
  getAttempts() { return this.attempts.map(a => ({...a})); }
  recordAttempt(attempt) {
    if (!valid(attempt)) throw new Error('解答記録の形式が正しくありません。');
    if (this.attempts.some(a => a.questionKey === attempt.questionKey && a.sessionId === attempt.sessionId)) return false;
    this.attempts.push({...attempt}); this.persist(); return true;
  }
  persist() {
    try { if (!this.storage) throw new Error('unavailable'); this.storage.setItem(STORAGE_KEY, JSON.stringify(this.attempts)); }
    catch { this.warning = '履歴を保存できません。この画面では学習を続けられますが、再読み込みすると今回の記録が失われる可能性があります。'; }
  }
  resetProgress() {
    try { (this.storage || globalThis.localStorage).removeItem(STORAGE_KEY); this.warning = ''; }
    catch { this.warning = '保存済み履歴を削除できませんでした。ブラウザーの保存設定を確認してください。'; }
    this.attempts = [];
  }
}
