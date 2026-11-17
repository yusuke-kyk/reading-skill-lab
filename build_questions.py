import json
from pathlib import Path
p=Path('/mnt/data/reading_skill_lab_starter')
# Each draft is a newly authored training item, not a verbatim copy of scanned text or official test item.
qs=[]
def add(id, category,difficulty,passage,question,options,answer,explanation,trap,visual=None,tags=None):
    qs.append(dict(id=id,category=category,difficulty=difficulty,format='single_choice',passage=passage,question=question,visual=visual,options=[{'id':c,'text':t} for c,t in zip('ABCD',options)],answer=answer,explanation=explanation,trap=trap,tags=tags or [],version=1,status='pilot'))
add('DEP-001','DEP','basic','講演会で山本さんが紹介した本を、鈴木さんが図書室で借りた。','本を図書室で借りたのは誰か。',['山本さん','鈴木さん','山本さんと鈴木さん','本文だけでは判断できない'],'B','「山本さんが」は「紹介した」に、「鈴木さんが」は「借りた」に係る。','「紹介した人」と「借りた人」を入れ替えない。',tags=['係り受け','主語述語'])
add('DEP-002','DEP','standard','赤い帽子をかぶった生徒の隣にいる先生が、校庭で写真を撮った。','赤い帽子をかぶっていたとわかるのは誰か。',['先生','生徒','先生と生徒の両方','誰もわからない'],'B','「赤い帽子をかぶった」は直後の「生徒」を修飾している。','先生の動作と生徒の服装を区別する。',tags=['修飾関係'])
add('ANA-001','ANA','basic','図書室では新刊案内を配った。これには貸出開始日と本の紹介が掲載されている。','「これ」が指すものはどれか。',['図書室','新刊案内','貸出開始日','本の紹介'],'B','「これ」は直前に登場した「新刊案内」を指す。','「これには」掲載される側の媒体を探す。',tags=['指示語'])
add('ANA-002','ANA','standard','佐藤さんは文化祭のポスターを先生に提出した。先生はそれを印刷し、校内に掲示した。','「それ」が指すものはどれか。',['佐藤さん','文化祭','ポスター','校内'],'C','印刷して掲示できるものは、佐藤さんが提出した「ポスター」である。','直前の人物ではなく、文脈上の対象物を確認する。',tags=['指示語','目的語'])
add('PARA-001','PARA','basic','文化祭の実行委員になった生徒は、全員研修に参加した。','本文と同じ意味になる文はどれか。',['研修参加者は全員実行委員である。','実行委員なのに研修に参加しなかった生徒はいない。','実行委員以外は研修に参加していない。','研修に参加した生徒だけが実行委員になれる。'],'B','すべての実行委員が研修に参加したことを、否定形で言い換えている。','「実行委員なら参加」と「参加者なら実行委員」は逆の関係。',tags=['全称','同義文'])
add('PARA-002','PARA','standard','発表会では、各班から少なくとも一人が発表した。','本文と同じ意味になる文はどれか。',['どの班も全員が発表した。','発表しなかった班は一つもない。','発表した生徒は一班につき一人だけだった。','一人も発表しなかった班があった。'],'B','各班に一人以上の発表者がいたので、発表者がゼロの班はない。','「少なくとも一人」と「一人だけ」は異なる。',tags=['少なくとも','数量表現'])
add('INF-001','INF','basic','A班はB班より早く到着した。C班はA班より遅く到着した。','この3班のうち、必ず最初に到着した班はどれか。',['A班','B班','C班','決められない'],'A','A班はB班より早く、かつC班より早い。したがって最初はA班。','B班とC班の前後関係が不明でも最初は決まる。',tags=['順序関係'])
add('INF-002','INF','standard','参加者30人は第一希望と第二希望のどちらか一方だけを必ず選んだ。第一希望を選んだのは18人だった。','第二希望を選んだ人数は何人か。',['8人','12人','18人','48人'],'B','参加者全員が二択のどちらか一方を選んだため、30−18＝12人。','重複選択や未選択がないことが本文に明示されている。',tags=['条件整理','集合'])
add('REP-001','REP','basic','','次の表を読み、正しい説明を一つ選べ。',['最も利用者が多いのは水曜日である。','火曜日は月曜日より4人多い。','木曜日は月曜日より1人多い。','火曜日から水曜日に2人減った。'],'B','火曜日32人、月曜日28人なので差は4人。','最大・比較対象・増減の数値を逐一確認する。',visual={'type':'table','caption':'図書室の曜日別利用者数','headers':['曜日','利用者数（人）'],'rows':[['月','28'],['火','32'],['水','31'],['木','27']]},tags=['表の読み取り'])
add('REP-002','REP','standard','','次の表を読み、必ず正しい説明を一つ選べ。',['1年生の利用者数の合計は19人である。','2年生の利用者数の合計は19人である。','午前の利用者数の合計は18人である。','午後の利用者数は午前より2人多い。'],'A','1年生は午前12人と午後7人で合計19人。2年生は21人、午前も午後も合計20人。','表の行・列を取り違えずに合計する。',visual={'type':'table','caption':'図書室の学年別・時間帯別利用者数','headers':['時間帯','1年生','2年生'],'rows':[['午前','12','8'],['午後','7','13']]},tags=['複数条件','表の読み取り'])
add('INSTd-001','INSTd','basic','「互恵」とは、関係する双方が互いに利益を得ることをいう。','この定義に最もよく当てはまる例はどれか。',['AさんがBさんに本を貸した。','AさんがBさんの作業を手伝い、BさんがAさんに勉強を教えた。','AさんがBさんから借りた物を返した。','AさんとBさんが同じ店で別々に買い物した。'],'B','双方が相手に利益をもたらす行動が明示されている。','片方への利益だけでは「双方が互いに」を満たさない。',tags=['定義理解','具体例'])
add('INSTd-002','INSTd','standard','「代替」とは、あるものの代わりに別のものを用いることをいう。','この定義に最もよく当てはまる例はどれか。',['校庭が使えないので、体育館を使って集会を実施した。','校庭が使えないので、集会を来週に延期した。','校庭での集会の参加人数を半分に減らした。','校庭で集会を開き、続けて運動会も実施した。'],'A','校庭の代わりに体育館という別の場所を使用している。','予定変更や規模縮小は必ずしも「別のものを用いる」ことではない。',tags=['定義理解','具体例'])
add('INSTm-001','INSTm','basic','「欠席率」を「欠席者数÷在籍者数×100（％）」と定義する。A組は20人中2人、B組は60人中3人が欠席した。','欠席率が高いのはどちらか。',['A組','B組','同じ','この情報だけでは判断できない'],'A','A組は2÷20×100＝10％、B組は3÷60×100＝5％。','実際の欠席者数ではなく、定義にある割合を比較する。',tags=['割合','定義理解'])
add('INSTm-002','INSTm','standard','「密度」を「物体の質量÷体積」と定義する。物体Xは質量120g・体積40cm³、物体Yは質量150g・体積75cm³である。','密度が大きい物体はどれか。',['物体X','物体Y','同じ','この情報だけでは判断できない'],'A','Xは120÷40＝3g/cm³、Yは150÷75＝2g/cm³。','質量だけでなく体積との比を計算する。',tags=['理科','定義理解'])
# Spread correct answer positions across the pilot; leave distractor content intact.
answer_positions=['B','D','C','A','B','D','A','C','D','A','C','B','A','B']
for q,target in zip(qs,answer_positions):
    original=q['answer']
    if original==target:
        continue
    correct=next(o for o in q['options'] if o['id']==original)
    wrong=[o for o in q['options'] if o['id']!=original]
    reordered=[]
    for letter in 'ABCD':
        o=correct if letter==target else wrong.pop(0)
        reordered.append({'id':letter,'text':o['text']})
    q['options']=reordered
    q['answer']=target
meta={'schemaVersion':1,'title':'読解力ラボ 試作問題バンク','disclaimer':'公式RST問題や著書の問題を転載したものではありません。授業担当者が内容を確認してから使用してください。','categories':[{'id':'DEP','name':'係り受け解析'},{'id':'ANA','name':'照応解決'},{'id':'PARA','name':'同義文判定'},{'id':'INF','name':'推論'},{'id':'REP','name':'イメージ同定'},{'id':'INSTd','name':'具体例同定（辞書）'},{'id':'INSTm','name':'具体例同定（理数）'}], 'questions':qs}
(p/'questions.pilot.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('wrote',len(qs),'pilot questions')
