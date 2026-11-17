import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// DOM描画先とイベント登録先を模した、画面接続のスモークテスト。
// ブラウザーのレイアウト検証は行わない。
test('ホーム→レポート→分野選択、全7分野・未挑戦表示を接続する',async()=>{
  const bank=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));
  const elements=new Map(), element=key=>{
    if(!elements.has(key)) elements.set(key,{textContent:'',disabled:false});
    return elements.get(key);
  };
  let html='';
  const app={set innerHTML(value){html=value},get innerHTML(){return html},focus(){},querySelectorAll(selector){
    if(selector==='[data-report-category]')return bank.categories.map(c=>{const el=element(c.id);el.dataset={reportCategory:c.id};return el});
    return [];
  }};
  const originals={document:globalThis.document,window:globalThis.window,fetch:globalThis.fetch};
  try {
    globalThis.document={querySelector:selector=>selector==='#app'?app:element(selector)};
    globalThis.window={scrollTo(){}};
    globalThis.fetch=async()=>({ok:true,json:async()=>bank});
    await import('../app.js');
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(html,/学習レポート/);element('#report').onclick();
    assert.match(html,/70問中 0問に解答済み/);
    assert.equal((html.match(/<dd>—<\/dd>/g)||[]).length,16);
    for(const c of bank.categories) assert.ok(html.includes(c.name));
    assert.match(html,/まだ現在の問題への解答記録がありません/);
    element('DEP').onclick();assert.match(html,/係り受け解析/);assert.match(html,/対象は10問/);
    element('#home').onclick();assert.match(html,/分野別トレーニング/);
  } finally {Object.assign(globalThis,originals)}
});
