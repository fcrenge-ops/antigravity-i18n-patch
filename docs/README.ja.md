# Antigravity 多言語ローカライズパッチスイート (Antigravity i18n Patch Suite)

<p align="center">
  <a href="../README.md">简体中文</a> | <a href="README.en.md">English</a> | <a href="README.zh-TW.md">繁體中文</a> | <b>日本語</b>
</p>

<p align="center">
  <a href="https://github.com/fcrenge-ops/antigravity-i18n-patch/actions/workflows/ci.yml"><img src="https://github.com/fcrenge-ops/antigravity-i18n-patch/actions/workflows/ci.yml/badge.svg" alt="CI Status"></a>
  <a href="https://github.com/fcrenge-ops/antigravity-i18n-patch/releases"><img src="https://img.shields.io/github/v/release/fcrenge-ops/antigravity-i18n-patch?color=3388ff&label=Release" alt="Release"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <a href="https://github.com/fcrenge-ops/antigravity-i18n-patch/pulls"><img src="https://img.shields.io/badge/PRs-Welcome-brightgreen" alt="PRs Welcome"></a>
</p>

**Google Antigravity 2.0** デスクトップクライアント専用に設計された、高互換性・非破壊・完全クロスプラットフォーム（Windows / macOS / Linux）対応の多言語ローカライズ（i18n）パッチスイートです。**インストール時の対話型言語選択**やコマンドライン引数による言語指定に対応し、**簡単な言語パック拡張機能**も備えています。

---

## 🌟 主な機能 (Key Features)

1. **プラグイン式多言語 i18n アーキテクチャ**
   - 単一の言語に依存せず、モジュール化された言語パック設計を採用。**日本語 (`ja-JP`)**、**簡体字中国語 (`zh-CN`)**、**繁体字中国語 (`zh-TW`)**、**英語テンプレート (`en-US`)** を標準搭載。
2. **インストール時に対話形式で言語を選択可能**
   - インストールスクリプト実行時、利用可能な言語パックを自動スキャンし、番号または言語コードで簡単に選択可能。
   - コマンドライン引数（`--lang ja-JP` など）での直接指定にも対応。
3. **完全クロスプラットフォーム対応 (Windows / macOS / Linux)**
   - 純粋な Node.js によるクロスプラットフォーム駆動。OS ごとの標準インストールパスやプロセスを自動検出。
4. **二重安全注入メカニズム**
   - `dist/preload.js` へのインライン注入と `dist/utils.js` でのフォールバック処理により、ページ更新や画面遷移時の言語ちらつきを完全に解消。
5. **ネイティブシステムメニューおよびトレイの日本語化**
   - Electron のネイティブトップメニュー（ファイル、編集、表示、ウィンドウ、ヘルプ等）およびタスクトレイメニューを日本語化。
6. **コードエディター・ターミナルの保護**
   - コード編集領域（`Monaco Editor`）、コードブロック（`<pre>`, `<code>`）、ターミナル出力（`xterm`）およびユーザー入力欄を厳格に保護し、開発コードやパスへの誤翻訳を防止。
7. **ワンクリック簡単インストール＆秒速復元**
   - Windows は `bin/install.bat` / `bin/restore.bat` をダブルクリックするだけ。macOS / Linux は `./bin/install.sh` / `./bin/restore.sh` を実行するだけで即座に反映・復元可能。

---

## 🚀 クイックスタート (Quick Start)

### 方法 1: Windows ユーザー（ダブルクリック実行）

1. `bin/` ディレクトリ内の **`install.bat`** をダブルクリックして実行します。
2. 表示される言語選択メニューで **`3`**（または `ja-JP`）を入力して Enter を押します：
   ```text
   ----------------------------------------------------
   请选择要安装的界面语言 (Select Language to Install):
     [1] zh-CN - 简体中文 (Simplified Chinese) [默认 (Default)]
     [2] en-US - English (US)
     [3] ja-JP - 日本語 (Japanese)
     [4] zh-TW - 繁體中文 (Traditional Chinese)
   ----------------------------------------------------
   请输入选项编号 [1-4] 或语言代码: 3
   ```
3. スクリプトが自動的に公式バックアップの作成、日本語パッチの適用、再パッケージ化を行います。
4. 元の公式英語版に戻す場合は、いつでも **`bin/restore.bat`** をダブルクリックするだけで復元できます。

---

### 方法 2: macOS / Linux ユーザー（ターミナル実行）

プロジェクトのルートディレクトリでターミナルを開き、実行します：

```bash
# 実行権限を付与（初回のみ）
chmod +x bin/install.sh bin/restore.sh

# 対話形式で言語を選択してインストール
./bin/install.sh

# または直接日本語を指定してワンクリックインストール
./bin/install.sh --lang ja-JP

# 公式英語版に復元する場合
./bin/restore.sh
```

---

### 方法 3: NPM コマンド（全プラットフォーム共通）

```bash
# 全言語パックのビルド
npm run build

# 日本語パックのみビルド
npm run build:ja-JP

# インストールスクリプトの実行
npm run install-patch

# 日本語の語彙カバー率のチェック
npm run check:ja-JP

# 公式英語版への復元
npm run restore
```

---

## 📁 ディレクトリ構成

```text
antigravity-i18n-patch/
├── bin/                           # 実行エントリーディレクトリ
│   ├── install.bat                # 【Windows】ダブルクリックインストール
│   ├── restore.bat                # 【Windows】ダブルクリック復元
│   ├── install.sh                 # 【macOS / Linux】ターミナルインストール
│   └── restore.sh                 # 【macOS / Linux】ターミナル復元
├── dist/                          # ビルド済みパッチ出力先
│   ├── patch-ja-JP.js             # 日本語パッチエンジン
│   ├── patch-zh-CN.js             # 簡体字中国語パッチエンジン
│   └── patch-zh-TW.js             # 繁体字中国語パッチエンジン
├── locales/                       # 言語パックディレクトリ
│   ├── ja-JP/                     # 【日本語パック】
│   │   ├── manifest.json          # メタデータ、フォント、トレイ設定
│   │   ├── dict.json              # 翻訳辞書 (2100+ 語彙)
│   │   ├── rules.js               # 動的正規表現ルール
│   │   └── menu.json              # ネイティブメニュー翻訳
│   ├── zh-CN/                     # 簡体字中国語パック
│   ├── zh-TW/                     # 繁体字中国語パック
│   └── en-US/                     # 英語ベースパック
├── scripts/                       # クロスプラットフォーム Node.js コアスクリプト
│   ├── locale_manager.js          # 言語パック自動スキャン・管理
│   ├── build.js                   # パッチコンパイラ
│   ├── install.js                 # インストール実行プログラム
│   ├── apply_patch.js             # ASAR パッチ注入ロジック
│   └── restore.js                 # 復元プログラム
├── docs/                          # 多言語ドキュメントディレクトリ
│   ├── README.en.md               # 英語ドキュメント (English)
│   ├── README.ja.md               # 日本語ドキュメント
│   └── README.zh-TW.md            # 繁体字中国語ドキュメント
├── package.json
└── README.md                      # 簡体字中国語ドキュメント (メイン)
```

---

## 📄 ライセンス (License)

本プロジェクトは [MIT License](https://opensource.org/licenses/MIT) に基づいて公開されています。
追加の語彙や改善の提案は、Pull Request または Issue にて歓迎いたします！
