import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ProgressRepository, STORAGE_KEY} from '../progress.js';
import {validateBank, selectQuestions, latestAttempts, questionKey} from '../quiz.js';
const data = JSON.parse(readFileSync(new URL('../data/questions.json', import.meta.url)));
const attempt = (q, correct=false, sessionId='s1') => ({questionKey:questionKey(q),category:q.category,selected:correct?q.answer:q.options.find(o=>o.id!==q.answer).id,isCorrect:correct,answeredAt:new Date().toISOString(),sessionId});
function storage() { const map = new Map(); return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}; }
const pilot = JSON.parse(readFileSync(new URL('../questions.pilot.json', import.meta.url)));
test('70問・7分野各10問とレビュー原本のバイト一致',()=>{
  validateBank(data); assert.equal(data.questions.length,70); assert.equal(data.categories.length,7);
  assert.deepEqual(readFileSync(new URL('../data/questions.json',import.meta.url)),readFileSync(new URL('../questions.all70.review.json',import.meta.url)));
  assert.deepEqual(data.categories,pilot.categories);
  for(const c of data.categories) assert.equal(data.questions.filter(q=>q.category===c.id).length,10);
  for(const q of pilot.questions) assert.deepEqual(data.questions.find(item=>item.id===q.id),q);
});
test('既存14問の保存履歴・正答率・復習待ちを70問でも保持',()=>{
  assert.equal(STORAGE_KEY,'reading-skill-lab:progress:v1');
  const store=storage();
  const previous=pilot.questions.map((q,i)=>attempt(q,i%2===0,`old-${i}`));
  const serialized=JSON.stringify(previous);store.setItem(STORAGE_KEY,serialized);
  const loaded=new ProgressRepository(()=>store), attempts=loaded.getAttempts(), latest=latestAttempts(attempts);
  assert.deepEqual(attempts,previous);assert.equal(store.getItem(STORAGE_KEY),serialized);
  assert.equal(attempts.length,14);assert.equal(attempts.filter(a=>a.isCorrect).length/attempts.length,0.5);
  const waiting=data.questions.filter(q=>latest.get(questionKey(q))?.isCorrect===false);
  assert.deepEqual(waiting.map(q=>q.id).sort(),pilot.questions.filter((_,i)=>i%2===1).map(q=>q.id).sort());
  const untried=data.questions.filter(q=>!latest.has(questionKey(q)));
  assert.equal(untried.length,56);
  const selected=selectQuestions(data.questions,attempts,'all',true);
  assert.ok(selected.slice(0,56).every(q=>!latest.has(questionKey(q))));
  loaded.recordAttempt(attempt(waiting[0],true,'new-review'));
  const reloaded=new ProgressRepository(()=>store);
  assert.deepEqual(reloaded.getAttempts().slice(0,14),previous);
  assert.equal(data.questions.filter(q=>latestAttempts(reloaded.getAttempts()).get(questionKey(q))?.isCorrect===false).length,6);
});
test('問題不足の調整・同一セッションの重複なし・未挑戦優先',()=>{
  const pool=data.questions.slice(0,2), chosen=selectQuestions(pool,[],10,true);
  assert.equal(chosen.length,2); assert.equal(new Set(chosen.map(q=>q.id)).size,2);
  assert.equal(selectQuestions(pool,[attempt(pool[0])],1,true)[0].id,pool[1].id);
  assert.equal(selectQuestions(data.questions,[],'all',true).length,70);
});
test('二重記録防止・再読み込み・復習正解による解除・履歴削除',()=>{
  const store=storage(), r=new ProgressRepository(()=>store), q=data.questions[0];
  assert.equal(r.recordAttempt(attempt(q)),true); assert.equal(r.recordAttempt(attempt(q)),false);
  const loaded=new ProgressRepository(()=>store); assert.equal(loaded.getAttempts().length,1);
  assert.equal(latestAttempts(loaded.getAttempts()).get(questionKey(q)).isCorrect,false);
  loaded.recordAttempt(attempt(q,true,'s2'));
  assert.equal(latestAttempts(loaded.getAttempts()).get(questionKey(q)).isCorrect,true);
  assert.equal(latestAttempts(loaded.getAttempts()).has(`${q.id}@2`),false);
  loaded.resetProgress(); assert.equal(new ProgressRepository(()=>store).getAttempts().length,0);
});
test('保存無効・容量超過・壊れた記録でも一時学習',()=>{
  const blocked=new ProgressRepository(()=>{throw Error('blocked')}); blocked.recordAttempt(attempt(data.questions[0]));
  assert.equal(blocked.getAttempts().length,1); assert.ok(blocked.warning);
  const store=storage();store.setItem(STORAGE_KEY,'{broken');
  const corrupt=new ProgressRepository(()=>store);assert.ok(corrupt.warning);corrupt.recordAttempt(attempt(data.questions[0]));assert.equal(corrupt.getAttempts().length,1);
  const quota=new ProgressRepository(()=>({getItem:()=>null,setItem:()=>{throw Error('quota')}}));quota.recordAttempt(attempt(data.questions[0]));assert.ok(quota.warning);assert.equal(quota.getAttempts().length,1);
});
test('不正なデータを拒否',()=>{
  for(const mutate of [d=>d.questions[0].answer='Z',d=>d.questions[0].options.pop(),d=>d.questions[0].category='unknown',d=>d.questions[1].id=d.questions[0].id,d=>d.questions[8].visual.rows[0].pop()]){
    const copy=structuredClone(data);mutate(copy);assert.throws(()=>validateBank(copy),/問題データ/);
  }
});
