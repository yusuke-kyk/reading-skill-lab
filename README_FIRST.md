# 読解力ラボ：Codexへ渡すスターターセット

## これは何？

これは**まだ完成したWebアプリではなく、Codexに実装してもらうための設計・試作問題データ**です。

- `SPEC.md`：先生・生徒それぞれの使い方、画面、保存仕様、採点の細部
- `CODEX_PROMPT.md`：Codexに貼り付ける指示文
- `questions.pilot.json`：7分野×2問＝14問のオリジナル試作問題
- `validate_questions.py`：問題データの構造チェック（文章の意味の正確さは人間のレビューが必要）
- `build_questions.py`：14問データの再生成用（通常は使わなくてよい）

## 最も簡単な使い方

1. GitHubで、**前回のタスク管理アプリとは別**の新しいリポジトリを作る。名前の例：`reading-skill-lab`。
2. `SPEC.md`、`CODEX_PROMPT.md`、`questions.pilot.json` をそのリポジトリに追加する。
3. Codexでそのリポジトリを開き、`CODEX_PROMPT.md` の全文を指示として入力する。
4. Codexの作成した変更内容を確認し、GitHubへコミットする。
5. GitHubの **Settings → Pages → Deploy from a branch → main / (root)** を選び、表示されたURLで開く。
6. スマホから試して、表示・誤答復習・再読み込み後の保存を検証する。

**大事**：まだすべての問題は `pilot`（試作）扱い。生徒へ本格配布する前に解答・解説を先生が確認し、適切な問題だけ `approved` に変更してください。

## 次の段階

14問でアプリを動かしたら、各7分野を5問→20問と増やす。問題を追加するときは新しいIDを付けて、採点プログラムには触れない。
