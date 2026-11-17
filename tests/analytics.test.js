import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeLearning, formatRate} from '../analytics.js';
import {ProgressRepository, STORAGE_KEY} from '../progress.js';
import {questionKey} from '../quiz.js';
const bank = JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));
const [a,b,c] = bank.questions;
const record = (q, correct, n=0) => ({questionKey:questionKey(q),category:q.category,selected:'A',isCorrect:correct,answeredAt:new Date(1700000000000-n*1000).toISOString(),sessionId:`s${n}`});
const analyze = attempts => analyzeLearning(bank.questions,bank.categories,attempts);
test('未挑戦は分母に含めず、解答なしの全体・7分野は—',()=>{
  const result=analyze([]);
  assert.deepEqual(result.overall,{total:70,answered:0,firstCorrect:0,latestCorrect:0});
  assert.equal(result.categories.length,7);
  for(const row of [result.overall,...result.categories]) {
    assert.equal(row.answered,0);assert.equal(formatRate(row.firstCorrect,row.answered),'—');assert.equal(formatRate(row.latestCorrect,row.answered),'—');
  }
  assert.ok(result.categories.every(row=>row.total===10));
});
test('初回・最新は記録順、複数回解答でも一問として集計する',()=>{
  const result=analyze([record(a,false,0),record(b,true,1),record(a,true,2),record(b,false,3),record(a,true,4),record(c,true,5)]);
  assert.deepEqual(result.overall,{total:70,answered:3,firstCorrect:2,latestCorrect:2});
  // a:誤→正、b:正→誤。日時は逆順でも保存順を使う。
  const dep=result.categories.find(row=>row.id===a.category);
  assert.equal(dep.answered,2);assert.equal(dep.firstCorrect,1);assert.equal(dep.latestCorrect,1);
  assert.equal(formatRate(result.overall.firstCorrect,result.overall.answered),'67%');
  const onlyA=analyze([record(a,false,0),record(a,true,1)]).overall;
  assert.equal(formatRate(onlyA.firstCorrect,onlyA.answered),'0%');
  assert.equal(formatRate(onlyA.latestCorrect,onlyA.answered),'100%');
});
test('旧版・削除済みIDを除外し分野は現在の問題定義から取得',()=>{
  const result=analyze([
    {...record(a,true),questionKey:`${a.id}@${a.version+1}`},
    {...record(a,true),questionKey:`${a.id}@0`},
    {...record(a,true),questionKey:'REMOVED-001@1'},
    {...record(b,false),category:'OLD-CATEGORY'}
  ]);
  assert.equal(result.overall.answered,1);assert.equal(result.overall.firstCorrect,0);
  assert.equal(result.categories.find(row=>row.id===b.category).answered,1);
  assert.equal(formatRate(result.overall.latestCorrect,1),'0%');
});
test('集計の繰り返しで保存キー・履歴・問題・追加の保存データを変更しない',()=>{
  assert.equal(STORAGE_KEY,'reading-skill-lab:progress:v1');
  const stored=JSON.stringify([record(a,false,0),record(a,true,1),record(b,true,2)]);
  const reads=[], storage={getItem:key=>{reads.push(key);return stored},setItem:()=>assert.fail('集計中の保存は禁止'),removeItem:()=>assert.fail('集計中の削除は禁止')};
  const repo=new ProgressRepository(()=>storage), input=repo.getAttempts();
  const beforeBank=JSON.stringify(bank), beforeAttempts=JSON.stringify(input);
  for(let i=0;i<3;i++) assert.equal(analyze(input).overall.answered,2);
  assert.deepEqual(reads,[STORAGE_KEY]);
  assert.equal(JSON.stringify(input),beforeAttempts);assert.equal(JSON.stringify(bank),beforeBank);
  assert.equal(JSON.stringify(new ProgressRepository(()=>storage).getAttempts()),stored);
});
