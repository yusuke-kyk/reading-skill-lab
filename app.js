import {CheckRepository, createCheckPlan, completeCheck, checkSummary} from './check.js';
import {analyzeLearning, formatRate} from './analytics.js';
import {ProgressRepository} from './progress.js';
import {questionKey, latestAttempts, selectQuestions, validateBank} from './quiz.js';
const app = document.querySelector('#app');
const repo = new ProgressRepository();
const checks = new CheckRepository();
let bank, questions, session, setup;
const e = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct = (correct,total) => total ? Math.round(correct / total * 100) + '%' : '—';
const categoryName = id => bank.categories.find(c => c.id === id)?.name || id;
const descriptions = ['主語と述語のつながりを読む','指示語が指すものを見つける','言い換えた文の意味を比べる','条件から確かなことを導く','文章と表の情報を照らし合わせる','言葉の定義を具体例に結びつける','理数の定義を使って判断する'];
function render(html) {
  app.innerHTML = `${repo.warning ? `<p class="notice" role="alert">${e(repo.warning)}</p>` : ''}${html}`;
  app.focus(); window.scrollTo(0,0);
}
function reviewPool() { const latest = latestAttempts(repo.getAttempts()); return questions.filter(q => latest.get(questionKey(q))?.isCorrect === false); }
function home() {
  const attempts = repo.getAttempts(), latest = latestAttempts(attempts), waiting = reviewPool().length;
  render(`${checks.warning ? `<p class="notice" role="alert">${e(checks.warning)}</p>` : ''}<section class="intro"><p class="eyebrow">READING SKILL LAB</p><h1>「読めた」を、<br class="mobile-break">確かな力に。</h1><p class="muted">一問ずつ、じっくり。7つの分野から読解の練習を始めましょう。</p></section>
  <section class="stats" aria-label="学習実績"><div><span>累計解答回数</span><strong>${attempts.length}<small> 回</small></strong></div><div><span>累計正答率</span><strong>${pct(attempts.filter(a => a.isCorrect).length,attempts.length)}</strong></div><div><span>復習待ち</span><strong>${waiting}<small> 問</small></strong></div></section>
  <button class="mode report-link" id="check"><span><b>読解力チェック</b><small>7分野 × 3問で、次に学ぶ分野を見つける</small></span><span aria-hidden="true">→</span></button>
  <button class="mode report-link" id="report"><span><b>学習レポート</b><small>初回と最新の正答率から、次に学ぶ分野を見つける</small></span><span aria-hidden="true">→</span></button>
  <nav class="modes" aria-label="トレーニングモード"><button class="mode" data-mode="random"><span class="mode-icon" aria-hidden="true">⇄</span><span><b>ランダム</b><small>7分野をまぜてトレーニング</small></span><span aria-hidden="true">→</span></button><button class="mode" data-mode="review"><span class="mode-icon" aria-hidden="true">↻</span><span><b>間違い直し</b><small>${waiting ? `${waiting}問をもう一度、理解へ` : '復習待ちはありません'}</small></span><span aria-hidden="true">→</span></button></nav>
  <section><div class="section-heading"><h2>分野別トレーニング</h2><span class="muted">7分野 · ${questions.length}問</span></div><div class="categories">${bank.categories.map((c,i) => {
    const pool = questions.filter(q => q.category === c.id);
    return `<button class="category" data-category="${e(c.id)}"><span class="category-number">0${i+1}</span><h3>${e(c.name)}</h3><p>${descriptions[i] || '文章を正確に読み取る練習'}</p><div><span>${pool.length}問 <span class="dot">·</span> 未挑戦 ${pool.filter(q => !latest.has(questionKey(q))).length}問</span><span aria-hidden="true">→</span></div></button>`;
  }).join('')}</div></section><aside class="info"><b>自分のペースで続けよう</b><p>履歴はこの端末・ブラウザーだけに保存され、他の端末には同期されません。ブラウザーデータの消去やシークレットモードでは履歴が残らない場合があります。</p><p>掲載問題は試作です。授業での利用前に先生による内容確認をお願いします。</p><button class="text-button" id="reset">学習データをすべて削除</button></aside>`);
  app.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => showSetup(b.dataset.mode));
  app.querySelectorAll('[data-category]').forEach(b => b.onclick = () => showSetup('category',b.dataset.category));
  document.querySelector('#check').onclick = showCheckSetup;
  document.querySelector('#report').onclick = showReport;
  document.querySelector('#reset').onclick = () => { if (confirm('このブラウザーの通常演習・読解力チェックの解答履歴と、診断テストの保存結果をすべて削除します。この操作は取り消せません。削除しますか？')) { repo.resetProgress(); checks.resetResults(); session = null; setup = null; home(); } };
}
const checkDisclaimer = '独自の練習問題による参考チェックです。公式RSTのスコアや能力判定ではありません。';
function showCheckSetup() {
  let plan, error;
  try { plan = createCheckPlan(questions,bank.categories,repo.getAttempts()); } catch (err) { error = err.message; }
  const saved = checks.getResults().reverse();
  render(`<button class="text-button" id="home">← ホームに戻る</button><section class="panel setup"><p class="eyebrow">読解力チェック Ver.1.2</p><h1>読解力チェック</h1><p>7分野から各3問、合計21問に答えます。原則、各分野の基礎・標準・発展を1問ずつ出題します。</p><p>解答確定後は変更できません。正誤・解説は21問を終えた後にまとめて表示します。</p><p>確定した解答は通常の学習履歴に記録します。途中終了・再読み込みでは未完了の結果は保存しません。</p><p class="notice">${e(checkDisclaimer)}</p>${plan?.reference ? '<p class="notice">未挑戦問題だけでは条件を満たせないため、既習問題を含む参考チェックです。</p>' : '<p class="muted">未挑戦問題から出題します。</p>'}${plan && !plan.balanced ? '<p class="notice">一部の分野で難易度が不足しているため、別の難易度で補います。</p>' : ''}${error ? `<p role="alert">${e(error)}</p>` : '<button class="primary" id="start-check">21問のチェックを始める →</button>'}</section>
  <section class="result-review"><h2>保存したチェック結果</h2>${checks.warning ? `<p class="notice" role="alert">${e(checks.warning)}</p>` : ''}${saved.map((r,i) => `<button class="secondary" data-saved-check="${i}">${e(new Date(r.completedAt).toLocaleString('ja-JP'))} · ${checkSummary(r).correct} / 21問${r.reference?' · 既習問題を含む参考チェック':''}</button>`).join('') || '<p class="muted">完了したチェック結果はまだありません。</p>'}</section>`);
  document.querySelector('#home').onclick = home;
  if (plan) document.querySelector('#start-check').onclick = () => {
    session = {id:crypto.randomUUID(),mode:'check',...plan,index:0,answers:[],locked:false}; showQuestion();
  };
  app.querySelectorAll('[data-saved-check]').forEach(button => button.onclick = () => showCheckResult(saved[Number(button.dataset.savedCheck)]));
}
function showCheckResult(result) {
  const summary = checkSummary(result), wrong = result.answers.filter(a => !a.isCorrect);
  render(`<section class="panel result"><p class="eyebrow">読解力チェック結果</p><h1>次の練習につなげよう。</h1><p class="muted">${e(new Date(result.completedAt).toLocaleString('ja-JP'))}</p><p class="score">${summary.correct}<small> / 21 問正解</small></p><p class="notice">${e(checkDisclaimer)}</p>${result.reference?'<p class="notice">既習問題を含む参考チェックです。</p>':''}${!result.balanced?'<p class="notice">難易度の不足を別の難易度で補った結果です。</p>':''}${checks.warning?`<p class="notice" role="alert">${e(checks.warning)}</p>`:''}<button class="secondary" id="check-list">保存結果の一覧へ</button><button class="secondary" id="home">ホームに戻る</button></section>
  <section><h2>7分野の結果</h2><div class="check-scores">${summary.categories.map(c => `<article class="panel"><h3>${e(c.name)}</h3><p><b>${c.correct} / ${c.total}問正解</b></p></article>`).join('')}</div></section>
  <section class="result-review"><h2>次に練習する分野</h2><p class="muted">今回の正答数が少ない分野を最大2つ表示します。同点の場合は分野の表示順です。各分野3問だけの結果なので、練習先を選ぶ目安にしてください。</p>${summary.recommendations.map(c => `<button class="secondary" data-check-practice="${e(c.id)}">${e(c.name)}を練習する →</button>`).join('') || '<p>全問正解です。好きな分野の練習を続けましょう。</p>'}</section>
  <section class="result-review"><h2>間違えた問題の振り返り ${wrong.length}問</h2>${wrong.map(a => `<details><summary>${e(a.q.question)}<span>解説を見る</span></summary>${a.q.passage?`<p>${e(a.q.passage)}</p>`:''}${visual(a.q)}${explanation(a.q,a.selected)}</details>`).join('') || '<p class="muted">今回の誤答はありません。</p>'}</section>`);
  document.querySelector('#home').onclick = home;
  document.querySelector('#check-list').onclick = showCheckSetup;
  app.querySelectorAll('[data-check-practice]').forEach(button => button.onclick = () => showSetup('category',button.dataset.checkPractice));
}
function reportStats(stats) {
  return `<dl class="report-stats"><div><dt>初回正答率</dt><dd>${formatRate(stats.firstCorrect,stats.answered)}</dd></div><div><dt>最新正答率</dt><dd>${formatRate(stats.latestCorrect,stats.answered)}</dd></div><div><dt>学習済み問題数</dt><dd>${stats.answered}<small> / ${stats.total}問</small></dd></div></dl>`;
}
function showReport() {
  const report = analyzeLearning(bank.questions,bank.categories,repo.getAttempts());
  render(`<button class="text-button" id="home">← ホームに戻る</button><section class="report-intro"><p class="eyebrow">学習分析 Ver.1.1</p><h1>学習レポート</h1><p class="muted">初回と今の理解を比べて、次の練習につなげましょう。</p></section>
  <section class="panel report-overall" aria-labelledby="overall-heading"><h2 id="overall-heading">全体の学習状況</h2>${reportStats(report.overall)}<label class="progress-label" for="learning-progress">学習進捗：${report.overall.total}問中 ${report.overall.answered}問に解答済み</label><progress id="learning-progress" value="${report.overall.answered}" max="${report.overall.total}"></progress></section>
  <aside class="info report-help"><p><b>初回正答率</b>：各問題で最初に記録された解答の正答率です。最初の理解を振り返れます。</p><p><b>最新正答率</b>：各問題で最後に記録された解答の正答率です。復習後の理解を確認できます。</p><p>解答した問題だけで算出し、未挑戦は含めません。解答がない場合は「—」です。現在の問題ID・版に一致する履歴を、記録された順に集計します。</p></aside>
  ${report.overall.answered === 0 ? '<p class="notice">まだ現在の問題への解答記録がありません。分野を選んで練習を始めましょう。</p>' : ''}
  <section aria-labelledby="category-report-heading"><div class="section-heading"><h2 id="category-report-heading">分野ごとの学習状況</h2></div><div class="report-categories">${report.categories.map(c => `<article class="panel report-category"><h3>${e(c.name)}</h3>${reportStats(c)}<button class="secondary" data-report-category="${e(c.id)}">この分野を練習する<span class="sr-only">：${e(c.name)}</span> →</button></article>`).join('')}</div></section>`);
  document.querySelector('#home').onclick = home;
  app.querySelectorAll('[data-report-category]').forEach(button => button.onclick = () => showSetup('category',button.dataset.reportCategory));
}
function showSetup(mode, category) {
  setup = {mode,category};
  const pool = mode === 'review' ? reviewPool() : questions.filter(q => mode !== 'category' || q.category === category);
  setup.pool = pool;
  const title = mode === 'category' ? categoryName(category) : mode === 'review' ? '間違い直し' : 'ランダムトレーニング';
  const latest = latestAttempts(repo.getAttempts());
  render(`<button class="text-button" id="home">← ホームに戻る</button><section class="panel setup"><p class="eyebrow">トレーニングの準備</p><h1>${e(title)}</h1>${pool.length ? `<p class="muted">対象は${pool.length}問です。少ない場合は、出題数を自動調整します。</p>${pool.every(q => latest.has(questionKey(q))) ? '<p class="notice">すべて挑戦済みです。学習済みの問題をもう一度出題します。</p>' : ''}<form id="setup-form"><fieldset><legend>問題数</legend><div class="count-options">${[['5','5問'],['10','10問'],['all','全問']].map(([v,t],i) => `<label><input type="radio" name="count" value="${v}" ${i===0?'checked':''}> ${t}</label>`).join('')}</div></fieldset><label class="check"><input type="checkbox" name="prioritize" checked> 未挑戦問題を優先</label><button class="primary" type="submit">開始する →</button></form>` : '<p class="empty">復習待ちはありません。<br>分野別やランダムで練習を続けましょう。</p>'}</section>`);
  document.querySelector('#home').onclick = home;
  const form = document.querySelector('#setup-form');
  if (form) form.onsubmit = event => {
    event.preventDefault();
    session = {id: crypto.randomUUID(), questions: selectQuestions(pool,repo.getAttempts(),form.elements.count.value,form.elements.prioritize.checked), index:0, answers:[], locked:false};
    showQuestion();
  };
}
function visual(q) {
  if (!q.visual) return '';
  const v = q.visual;
  return `<div class="table-wrap"><table><caption>${e(v.caption)}</caption><thead><tr>${v.headers.map(h => `<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${v.rows.map(r => `<tr>${r.map((c,i) => i === 0 ? `<th scope="row">${e(c)}</th>` : `<td>${e(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function explanation(q, selected) { return `<p><b>正解：${e(q.answer)}．${e(q.options.find(o => o.id === q.answer).text)}</b></p><p>${e(q.explanation)}</p><div class="trap"><b>着眼点</b><p>${e(q.trap)}</p></div>${selected ? `<p class="muted">あなたの解答：${e(selected)}</p>` : ''}`; }
function showQuestion() {
  const q = session.questions[session.index]; session.locked = false;
  render(`<div class="question-top"><button class="text-button" id="quit">ホームに戻る</button><span>${session.index+1} / ${session.questions.length} 問</span></div><progress value="${session.index+1}" max="${session.questions.length}" aria-label="出題の進捗"></progress><section class="panel question"><div class="badges"><span>${e(categoryName(q.category))}</span><span>${{basic:'基礎',standard:'標準',advanced:'発展'}[q.difficulty]}</span>${q.status==='pilot'?'<span class="pilot">試作問題</span>':''}</div><h1 class="question-title">${e(q.question)}</h1>${q.passage ? `<div class="passage">${e(q.passage)}</div>` : ''}${visual(q)}<form id="answer-form"><fieldset><legend class="muted">答えを一つ選んでください</legend><div class="options">${q.options.map(o => `<label class="option"><input type="radio" name="answer" value="${o.id}" required><span class="option-letter">${o.id}</span><span>${e(o.text)}</span></label>`).join('')}</div></fieldset><button class="primary" id="submit" disabled>解答する</button></form><div id="feedback" role="status" aria-live="polite"></div></section>`);
  document.querySelector('#quit').onclick = () => { if(confirm(session.mode === 'check' ? 'チェックを途中終了しますか？ 完了結果は保存されません。確定済みの解答は学習履歴に残ります。' : '今回のトレーニングを終了してホームに戻りますか？ 確定済みの解答は記録されています。')) home(); };
  const form = document.querySelector('#answer-form'), submit = document.querySelector('#submit');
  form.onchange = () => { if (!session.locked) submit.disabled = false; };
  form.onsubmit = event => {
    event.preventDefault(); if (session.locked || !form.elements.answer.value) return;
    session.locked = true;
    const selected = form.elements.answer.value, isCorrect = selected === q.answer;
    repo.recordAttempt({questionKey:questionKey(q), category:q.category, selected, isCorrect, answeredAt:new Date().toISOString(), sessionId:session.id});
    session.answers.push({q,selected,isCorrect});
    form.querySelectorAll('input,button').forEach(el => el.disabled = true);
    if (session.mode === 'check') {
      const feedback = document.querySelector('#feedback');
      feedback.innerHTML = `<p tabindex="-1">解答を記録しました。正誤・解説は最後に表示します。</p>${repo.warning?`<p class="notice">${e(repo.warning)}</p>`:''}<button class="primary" id="next">${session.index+1===session.questions.length?'チェック結果を見る':'次の問題へ'} →</button>`;
      feedback.querySelector('p').focus();
      document.querySelector('#next').onclick = () => {
        if (++session.index < session.questions.length) showQuestion();
        else { const result = completeCheck(session,bank.categories); checks.save(result); showCheckResult(result); }
      };
      return;
    }
    form.querySelectorAll('.option').forEach(label => { if (label.querySelector('input').value === q.answer) label.classList.add('correct'); });
    const feedback = document.querySelector('#feedback');
    feedback.innerHTML = `<div class="feedback ${isCorrect?'success':'failure'}" tabindex="-1"><h2>${isCorrect?'○ 正解':'× 不正解'}</h2>${explanation(q)}${repo.warning ? `<p class="notice">${e(repo.warning)}</p>` : ''}</div><button class="primary" id="next">${session.index+1 === session.questions.length?'結果を見る':'次の問題へ'} →</button>`;
    feedback.querySelector('.feedback').focus();
    document.querySelector('#next').onclick = () => { if (++session.index < session.questions.length) showQuestion(); else showResult(); };
  };
}
function showResult() {
  const correct = session.answers.filter(a => a.isCorrect).length, wrong = session.answers.filter(a => !a.isCorrect);
  render(`<section class="panel result"><p class="eyebrow">トレーニング完了</p><h1>おつかれさまでした。</h1><p class="score">${correct}<small> / ${session.questions.length} 問正解</small></p><p>今回の正答率 <b>${pct(correct,session.questions.length)}</b></p><p class="muted">${wrong.length ? '解説を読み返して、理解を一歩深めましょう。' : 'すべて正解です。この調子で続けましょう。'}</p><button class="primary" id="again">${setup.mode==='category'?'同じ分野をもう一度':'同じモードをもう一度'}</button><button class="secondary" id="home">ホームに戻る</button></section><section class="result-review"><h2>今回の間違いを振り返る <small>${wrong.length}問</small></h2>${wrong.map(a => `<details><summary>${e(a.q.question)}<span>解説を見る</span></summary>${a.q.passage?`<p>${e(a.q.passage)}</p>`:''}${visual(a.q)}${explanation(a.q,a.selected)}</details>`).join('') || '<p class="muted">今回の誤答はありません。</p>'}</section>`);
  document.querySelector('#home').onclick = home;
  document.querySelector('#again').onclick = () => showSetup(setup.mode,setup.category);
}
async function load() {
  try {
    const response = await fetch('./data/questions.json');
    if (!response.ok) throw new Error('通信に失敗しました。');
    bank = validateBank(await response.json()); questions = bank.questions.filter(q => q.status !== 'draft');
    if (!questions.length) throw new Error('出題できる問題がありません。');
    document.querySelector('.edition').textContent = `試作版 / ${questions.length}問`;
    home();
  } catch (error) {
    render(`<section class="panel"><h1>問題を読み込めませんでした</h1><p>通信環境や問題データを確認して、もう一度お試しください。</p><p class="muted">${e(error.message)}</p><button class="primary" id="retry">再読み込み</button></section>`);
    document.querySelector('#retry').onclick = load;
  }
}
load();
