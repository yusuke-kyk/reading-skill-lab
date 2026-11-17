import {questionKey} from './quiz.js';

// 履歴配列の記録順を使用する。日時で並べ替えず、入力を変更しない。
export function analyzeLearning(questions, categories, attempts) {
  const current = new Map(questions.map(q => [questionKey(q), q]));
  const first = new Map(), latest = new Map();
  for (const attempt of attempts) {
    if (!current.has(attempt.questionKey)) continue;
    if (!first.has(attempt.questionKey)) first.set(attempt.questionKey, attempt);
    latest.set(attempt.questionKey, attempt);
  }
  function summarize(pool) {
    let answered = 0, firstCorrect = 0, latestCorrect = 0;
    for (const q of pool) {
      const key = questionKey(q);
      if (!first.has(key)) continue;
      answered++;
      if (first.get(key).isCorrect) firstCorrect++;
      if (latest.get(key).isCorrect) latestCorrect++;
    }
    return {total: pool.length, answered, firstCorrect, latestCorrect};
  }
  return {
    overall: summarize(questions),
    categories: categories.map(c => ({...c, ...summarize(questions.filter(q => q.category === c.id))}))
  };
}

export const formatRate = (correct, answered) => answered ? `${Math.round(correct / answered * 100)}%` : '—';
