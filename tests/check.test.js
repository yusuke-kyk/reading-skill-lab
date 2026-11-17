import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCheckPlan,completeCheck,checkSummary,CheckRepository,CHECK_KEY} from '../check.js';
import {questionKey} from '../quiz.js';
import {ProgressRepository,STORAGE_KEY} from '../progress.js';
const bank=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));
function finish(plan,id='check1') {
  return completeCheck({id,...plan,answers:plan.questions.map((q,i)=>({q,selected:i%2?q.answer:q.options.find(o=>o.id!==q.answer).id,isCorrect:!!(i%2)}))},bank.categories);
}
test('21問・7分野各3問・基礎標準発展を1問ずつ、重複なし',()=>{
  const plan=createCheckPlan(bank.questions,bank.categories,[]);
  assert.equal(plan.questions.length,21);assert.equal(new Set(plan.questions.map(questionKey)).size,21);
  assert.equal(plan.reference,false);assert.equal(plan.balanced,true);
  for(const c of bank.categories) assert.deepEqual(plan.questions.filter(q=>q.category===c.id).map(q=>q.difficulty).sort(),['advanced','basic','standard']);
});
test('難易度ごとに未挑戦優先、既習混在を参考チェックとして検出',()=>{
  const eligible=new Set();
  for(const c of bank.categories) for(const d of ['basic','standard','advanced']) eligible.add(questionKey(bank.questions.find(q=>q.category===c.id&&q.difficulty===d)));
  const attempts=bank.questions.filter(q=>!eligible.has(questionKey(q))).map(q=>({questionKey:questionKey(q)}));
  const plan=createCheckPlan(bank.questions,bank.categories,attempts);
  assert.equal(plan.reference,false);assert.ok(plan.questions.every(q=>eligible.has(questionKey(q))));
  const category=bank.categories[0].id;
  const extra=bank.questions.filter(q=>q.category===category&&q.difficulty==='advanced').map(q=>({questionKey:questionKey(q)}));
  assert.equal(createCheckPlan(bank.questions,bank.categories,[...attempts,...extra]).reference,true);
  assert.equal(createCheckPlan(bank.questions,bank.categories,bank.questions.map(q=>({questionKey:questionKey(q)}))).reference,true);
});
test('難易度不足時は別難易度で補い、不足の分野では開始させない',()=>{
  const reduced=bank.questions.filter(q=>q.difficulty!=='advanced');
  const plan=createCheckPlan(reduced,bank.categories,[]);
  assert.equal(plan.questions.length,21);assert.equal(plan.balanced,false);
  assert.throws(()=>createCheckPlan(bank.questions.filter(q=>q.category!==bank.categories[0].id),bank.categories,[]));
});
test('結果集計・最大2分野の提案・全問正解は提案なし',()=>{
  const result=finish(createCheckPlan(bank.questions,bank.categories,[]));
  const summary=checkSummary(result);
  assert.equal(summary.correct,10);assert.equal(summary.categories.reduce((n,c)=>n+c.correct,0),10);
  assert.ok(summary.categories.every(c=>c.total===3));assert.equal(summary.recommendations.length,2);
  const sorted=[...summary.categories].sort((a,b)=>a.correct-b.correct);
  assert.deepEqual(summary.recommendations.map(c=>c.id),sorted.slice(0,2).map(c=>c.id));
  const perfect={...result,answers:result.answers.map(a=>({...a,selected:a.q.answer,isCorrect:true}))};
  assert.equal(checkSummary(perfect).recommendations.length,0);
});
test('完了結果の再読込・二重保存防止・途中結果拒否・既存学習履歴保持',()=>{
  const map=new Map(),store={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  const history=new ProgressRepository(()=>store),q=bank.questions[0];
  history.recordAttempt({questionKey:questionKey(q),category:q.category,selected:q.answer,isCorrect:true,answeredAt:new Date().toISOString(),sessionId:'old'});
  const before=map.get(STORAGE_KEY), result=finish(createCheckPlan(bank.questions,bank.categories,history.getAttempts()));
  const repo=new CheckRepository(()=>store);repo.save(result);repo.save(result);
  assert.notEqual(CHECK_KEY,STORAGE_KEY);assert.equal(map.get(STORAGE_KEY),before);
  assert.deepEqual(new CheckRepository(()=>store).getResults(),[result]);
  assert.throws(()=>repo.save({...result,answers:result.answers.slice(0,20)}));
  assert.equal(repo.getResults().length,1);
  assert.throws(()=>repo.save({...result,answers:result.answers.map((a,i)=>i?a:{...a,isCorrect:!a.isCorrect})}));
});
test('保存禁止・壊れた保存結果でも一時利用可能',()=>{
  const result=finish(createCheckPlan(bank.questions,bank.categories,[]));
  for(const provider of [()=>{throw Error('blocked')},()=>({getItem:()=>'{broken',setItem:()=>assert.fail('破損データを上書きしない')}),()=>({getItem:()=>null,setItem:()=>{throw Error('quota')}})]) {
    const repo=new CheckRepository(provider);repo.save(result);assert.ok(repo.warning);assert.equal(repo.getResults().length,1);
  }
});

test('両方の保存キーとメモリーを削除し、再読込でも空・削除後の学習も保存できる',()=>{
  const map=new Map([['other-app','keep']]),store={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const history=new ProgressRepository(()=>store),checks=new CheckRepository(()=>store);
  const q=bank.questions[0],attempt={questionKey:questionKey(q),category:q.category,selected:q.answer,isCorrect:true,answeredAt:new Date().toISOString(),sessionId:'before-reset'};
  history.recordAttempt(attempt);checks.save(finish(createCheckPlan(bank.questions,bank.categories,[])));
  assert.equal(history.resetProgress(),true);assert.equal(checks.resetResults(),true);
  assert.deepEqual(history.getAttempts(),[]);assert.deepEqual(checks.getResults(),[]);
  assert.deepEqual(new ProgressRepository(()=>store).getAttempts(),[]);assert.deepEqual(new CheckRepository(()=>store).getResults(),[]);
  assert.equal(map.get('other-app'),'keep');assert.equal(map.has(STORAGE_KEY),false);assert.equal(map.has(CHECK_KEY),false);
  history.recordAttempt({...attempt,sessionId:'after-reset'});checks.save(finish(createCheckPlan(bank.questions,bank.categories,[]),'after-reset'));
  assert.equal(new ProgressRepository(()=>store).getAttempts().length,1);assert.equal(new CheckRepository(()=>store).getResults().length,1);
});
test('削除失敗はデータを保持し警告、再実行で削除できる',()=>{
  const map=new Map(),store={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:()=>{throw Error('blocked')}};
  const history=new ProgressRepository(()=>store),checks=new CheckRepository(()=>store),q=bank.questions[0];
  history.recordAttempt({questionKey:questionKey(q),category:q.category,selected:q.answer,isCorrect:true,answeredAt:new Date().toISOString(),sessionId:'s'});
  checks.save(finish(createCheckPlan(bank.questions,bank.categories,[])));
  const before=new Map(map);
  assert.equal(history.resetProgress(),false);assert.equal(checks.resetResults(),false);
  assert.deepEqual(map,before);assert.equal(history.getAttempts().length,1);assert.equal(checks.getResults().length,1);
  assert.ok(history.warning);assert.ok(checks.warning);
  store.removeItem=k=>map.delete(k);history.resetProgress();checks.resetResults();assert.equal(map.size,0);
});
test('破損した保存データも明示的な削除後は新しい学習を保存できる',()=>{
  const map=new Map([[STORAGE_KEY,'{broken'],[CHECK_KEY,'{broken']]);
  const store={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const history=new ProgressRepository(()=>store),checks=new CheckRepository(()=>store);
  assert.ok(history.warning);assert.ok(checks.warning);
  history.resetProgress();checks.resetResults();assert.equal(map.size,0);assert.equal(history.warning,'');assert.equal(checks.warning,'');
  const q=bank.questions[0];history.recordAttempt({questionKey:questionKey(q),category:q.category,selected:q.answer,isCorrect:true,answeredAt:new Date().toISOString(),sessionId:'s'});
  checks.save(finish(createCheckPlan(bank.questions,bank.categories,[])));
  assert.equal(new ProgressRepository(()=>store).getAttempts().length,1);assert.equal(new CheckRepository(()=>store).getResults().length,1);
});
