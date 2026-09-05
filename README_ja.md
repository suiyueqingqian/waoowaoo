<p align="center">
  <a href="https://trendshift.io/repositories/22585?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-22585" target="_blank" rel="noopener noreferrer">
    <img src="https://trendshift.io/api/badge/trendshift/repositories/22585/daily" alt="waooAI%2Fwaoowaoo | Trendshift" width="250" height="55"/>
  </a>
</p>

<p align="center">右側の Assistant と対話し、キャンバスに参考素材をアップロードして整理しながら、画像や動画を制作・改善できる AI ワークスペースです。</p>

<p align="center"><a href="https://www.waoowaoo.com/">ウェイトリストに参加</a> · <a href="https://github.com/waooAI/waoowaoo/issues">不具合を報告</a></p>

[English](README.md) · [简体中文](README_zh.md) · [日本語](README_ja.md) · [한국어](README_ko.md)

> [!IMPORTANT]
> **ベータ版**：不具合や未完成の部分があります。継続的に更新していますので、コミュニティでご意見をお寄せください。

WeChat / コミュニティ

<img src="https://github.com/user-attachments/assets/0f4ff766-f059-4554-9193-caf34b081c7b" width="30%">

---

## ✨ 機能

waoowaoo は、対話、素材、生成結果を一つのプロジェクトにまとめる制作ツールです。アイデアから始めて、キャラクターの設定画、ブランドのビジュアル、アニメーション短編などを少しずつ形にできます。最初から小説や脚本一式を用意する必要はありません。

- **キャンバスで整理**：素材をアップロードし、画像や動画を確認して、プロジェクト内で再利用できます。
- **Assistant と継続して制作**：目的を伝え、既存の素材を参照しながら、生成や修正を進められます。
- **生成条件を自分で選択**：下書きカードで、モデルが対応する縦横比、動画の長さなどを設定できます。
- **参考画像で方向性を共有**：モデルの対応範囲に応じて、参考画像、開始フレーム、開始・終了フレームを使用できます。
- **結果を仕上げる**：生成内容をプレビューし、別のバージョンを作成したり、動画クリップを結合したりできます。

選べる設定や参考素材の種類はモデルによって異なります。すべてのモデルが全機能に対応しているわけではありません。

---

## 🚀 はじめに

ローカルのターミナルを操作できる AI コーディングアシスタントに、次の文章をコピーして渡してください。使用環境と選択したリリースに合わせて、インストールを進められます。

```text
このコンピューターに waoowaoo をインストールしてください。公開リポジトリは以下です。
https://github.com/waooAI/waoowaoo

最初に OS、Docker の利用状況、既存の waoowaoo 環境やデータの有無を確認してください。
docs/INSTALL.md とインストール対象の Release の説明を読み、同じバージョンの
インストール用ファイルを使用してください。
文書に従ってビルド済み Docker イメージを使い、アプリと対応する Codex runtime、
必要な依存サービスを準備してください。イメージの場所、タグ、digest、起動順序を推測しないでください。
公開済みの必要なファイルがない場合は不足を説明し、出所不明のイメージに置き換えないでください。

必要な秘密鍵やパスワードには、それぞれ安全なランダム値を生成してください。
関連する設定値の整合性を文書に従って保ち、秘密情報は必要なローカル設定だけに保存してください。
秘密情報をチャットやログに表示したり、Git にコミットしたりしないでください。
既存の設定やデータを保持し、既存環境の上書き、ボリュームの初期化、ファイルの削除はしないでください。
既存環境がある場合は、データを保つ更新方法を説明してから、確認が必要な操作を進めてください。
OS の権限や手動操作が必要なら、その目的と手順を説明してください。
同じ Release の docker/caddy/Caddyfile を使い、Compose で Caddy を起動してください。
既定値は SELF_HOSTED_HOST=localhost、SELF_HOSTED_HTTPS_PORT=1443 です。
APP_HOST_PORT=13000 は HTTP リダイレクト専用で、NEXTAUTH_URL は overlay が設定します。
Caddy の /data と /config の名前付きボリュームを保持してください。
root.crt だけを書き出し、証明書を信頼する意味を説明して私の明示的な承認を得てから、
ブラウザーを動かすホスト OS に登録してください。Windows と WSL の信頼ストアは別です。
root.key の書き出しや TLS 検証の回避は禁止です。https://localhost:1443 で警告がなく、
複数タブのイベントストリームを含む通信がブラウザーで実際に h2 を使うことを確認してください。
SSE のタブ接続数と AI タスクの同時実行数は別のものです。

完了後、サービスの正常性と Web ページへのアクセスを確認し、URL と初回利用手順を教えてください。
自分の OpenRouter API Key を Web 画面で設定する方法を案内してください。
API Key をチャットへ送るよう求めず、有料の生成 API を自動実行しないでください。
問題で停止した場合は、具体的な原因と次の手順を説明してください。
```

リリース版の Compose は Caddy を自動起動します。ローカル証明書の信頼を承認した後、**https://localhost:1443** を開いてください。`13000` は HTTP リダイレクト専用です。ソース開発の `npm run dev` は引き続き `http://localhost:3001` を使います。

詳しい導入・更新手順は [インストール文書](docs/INSTALL.md) を参照してください。更新時も対象 Release の説明に従い、既存データを保持してください。

---

## 🔧 API 設定

現在、画面から選べる API サービスは **OpenRouter** です。対話、画像、動画の API 利用には料金が発生する場合があり、利用者のサービスアカウントで負担します。アプリをローカルで動かしても、モデルの利用が無料になるわけではありません。

試作では、短い動画や低い対応解像度を選ぶと費用を抑えられます。送信前にモデル、設定、料金表示を確認し、OpenRouter の残高にも注意してください。

アプリの画面は現在、**中国語と英語**に対応しています。README は英語・中国語・日本語・韓国語で提供していますが、画面の対応言語とは異なります。

---

## 📦 技術構成

- **Framework**: Next.js 16 + React 19
- **Database**: MySQL + Prisma ORM
- **Durable execution**: Temporal
- **Transport & cache**: Redis
- **Media storage**: Private MinIO (S3)
- **Styling**: Tailwind CSS v4
- **Auth**: NextAuth.js

---

## 📦 プレビュー



---

## 🤝 参加方法

コアチームが保守しています。[Issues](https://github.com/waooAI/waoowaoo/issues) で不具合や機能をご提案ください。Pull Request も参考として確認しますが、外部 PR を直接マージせず、チーム内で変更を実装します。

---

## ライセンス

v0.5.0-beta.1 以降の本配布版には [Elastic License 2.0](LICENSE) が適用されます。条項に従う個人利用、社内商用利用、改変、再配布が認められます。ソフトウェアの主要機能を第三者にホスティングまたはマネージドサービスとして提供するには、別途許諾が必要です。旧版と第三者コンポーネントにはそれぞれのライセンスが引き続き適用されます。これはソース公開型ソフトウェアであり、OSI 認定のオープンソースではありません。

---

**Made with ❤️ by waoowaoo team**

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=saturndec/waoowaoo&type=date&legend=top-left)](https://www.star-history.com/#saturndec/waoowaoo&type=date&legend=top-left)
