import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STORAGE_KEY} from '../progress.js';
import {CHECK_KEY} from '../check.js';
const bank=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));
test('模擬DOMで途中終了・21問中の正誤非表示・結果保存と再表示・通常演習で保持・全削除とキャンセル',async()=>{
  let html='',feedback='';
  const map=new Map(),els=new Map();
  const el=k=>{if(!els.has(k))els.set(k,{focus(){},dataset:{}});return els.get(k)};
  const form={elements:{answer:{value:''}},querySelectorAll:()=>[]};
  const feed={set innerHTML(v){feedback=v},querySelector:()=>({focus(){}})};
  const app={set innerHTML(v){html=v;feedback=''},focus(){},querySelectorAll(selector){
    if(selector==='[data-check-practice]')return bank.categories.filter(c=>html.includes(`data-check-practice="${c.id}"`)).map(c=>{const b=el(c.id);b.dataset.checkPractice=c.id;return b});
    if(selector==='[data-saved-check]')return html.includes('data-saved-check="0"')?[Object.assign(el('saved'),{dataset:{savedCheck:'0'}})]:[];
    return [];
  }};
  const keys=['document','window','fetch','localStorage','confirm'];
  const previous=Object.fromEntries(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  try {
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}});
    globalThis.document={querySelector:k=>k==='#app'?app:k==='#answer-form'?form:k==='#feedback'?feed:el(k)};
    globalThis.window={scrollTo(){}};globalThis.confirm=()=>true;
    globalThis.fetch=async()=>({ok:true,json:async()=>bank});
    await import('../app.js');await new Promise(r=>setImmediate(r));
    el('#check').onclick();assert.match(html,/21問/);el('#start-check').onclick();
    function answer() {
      const escape=v=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const q=bank.questions.find(q=>html.includes(escape(q.question))&&q.options.every(o=>html.includes(escape(o.text))));assert.ok(q);
      form.elements.answer.value=q.options.find(o=>o.id!==q.answer).id;
      form.onchange();form.onsubmit({preventDefault(){}});
      assert.doesNotMatch(feedback,/正解：|× 不正解|○ 正解|着眼点/);
      assert.match(feedback,/正誤・解説は最後に表示/);
    }
    answer();form.onsubmit({preventDefault(){}});assert.equal(JSON.parse(map.get(STORAGE_KEY)).length,1);
    el('#quit').onclick();assert.equal(map.has(CHECK_KEY),false);
    const old=JSON.parse(map.get(STORAGE_KEY))[0];
    el('#check').onclick();el('#start-check').onclick();
    for(let i=0;i<21;i++){answer();el('#next').onclick()}
    assert.match(html,/読解力チェック結果/);assert.match(html,/0<small> \/ 21/);assert.match(html,/公式RSTのスコアや能力判定ではありません/);
    const results=JSON.parse(map.get(CHECK_KEY));assert.equal(results.length,1);assert.equal(results[0].answers.length,21);
    const history=JSON.parse(map.get(STORAGE_KEY));assert.equal(history.length,22);assert.deepEqual(history[0],old);
    assert.ok(history.slice(1).every(a=>a.sessionId===results[0].sessionId));
    el('#check-list').onclick();el('saved').onclick();assert.match(html,/間違えた問題の振り返り 21問/);
    const button=bank.categories.map(c=>el(c.id)).find(b=>b.onclick);button.onclick();assert.match(html,/トレーニングの準備/);
    const savedBefore=map.get(CHECK_KEY), historyBefore=JSON.parse(map.get(STORAGE_KEY));
    // 通常演習の確定でも既存の診断結果と解答記録を保持する。
    el('#setup-form').elements={count:{value:'5'},prioritize:{checked:true}};
    el('#setup-form').onsubmit({preventDefault(){}});
    form.elements.answer.value='A';form.onchange();form.onsubmit({preventDefault(){}});
    assert.deepEqual(JSON.parse(map.get(STORAGE_KEY)).slice(0,22),historyBefore);
    assert.equal(JSON.parse(map.get(STORAGE_KEY)).length,23);assert.equal(map.get(CHECK_KEY),savedBefore);
    el('#quit').onclick();assert.match(html,/学習データをすべて削除/);
    const beforeCancel=map.get(STORAGE_KEY);let confirmation='';
    globalThis.confirm=message=>{confirmation=message;return false};el('#reset').onclick();
    assert.match(confirmation,/取り消せません/);assert.match(confirmation,/解答履歴/);assert.match(confirmation,/診断テストの保存結果/);
    assert.equal(map.get(STORAGE_KEY),beforeCancel);assert.equal(map.get(CHECK_KEY),savedBefore);
    map.set('other-app','keep');globalThis.confirm=()=>true;el('#reset').onclick();
    assert.equal(map.has(STORAGE_KEY),false);assert.equal(map.has(CHECK_KEY),false);assert.equal(map.get('other-app'),'keep');
    el('#report').onclick();assert.match(html,/70問中 0問に解答済み/);
    el('#home').onclick();el('#check').onclick();assert.match(html,/完了したチェック結果はまだありません/);

  } finally {
    for(const k of keys) {if(previous[k])Object.defineProperty(globalThis,k,previous[k]);else delete globalThis[k]}
  }
});
