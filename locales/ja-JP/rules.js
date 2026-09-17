/**
 * 日本語 (ja-JP) 动态正则规则
 * 用于处理带动态数字、时间、相对日期、配额等复杂文本
 */
module.exports = [
  { pattern: /^Thought for (\d+)(s|m|h)$/i, replace: '思考時間 $1$2' },
  { pattern: /^Worked for (\d+)(s|m|h)$/i, replace: '稼働時間 $1$2' },
  { pattern: /^Updated\s+(\d{1,2}:\d{2})$/i, replace: '$1 に更新' },
  { pattern: /^(\d+)\s+commands?$/i, replace: '$1 件のコマンド' },
  { pattern: /^(\d+)\s+conversations?$/i, replace: '$1 件の会話' },
  { pattern: /^(\d+)\s+tasks?$/i, replace: '$1 件のタスク' },
  { pattern: /^(\d+)\s+files?\s+changed$/i, replace: '$1 個のファイルが変更されました' },
  { pattern: /^(\d+)\s+subagents?$/i, replace: '$1 個のサブエージェント' },
  { pattern: /^(\d+)\s*m\s+ago$/i, replace: '$1 分前' },
  { pattern: /^(\d+)\s*h\s+ago$/i, replace: '$1 時間前' },
  { pattern: /^(\d+)\s*d\s+ago$/i, replace: '$1 日前' },
  { pattern: /^(\d+)\s+days?\s+ago$/i, replace: '$1 日前' },
  { pattern: /^(\d+)\s+hours?\s+ago$/i, replace: '$1 時間前' },
  { pattern: /^(\d+)\s+minutes?\s+ago$/i, replace: '$1 分前' },
  { pattern: /^(\d+)\s+seconds?\s+ago$/i, replace: '$1 秒前' },
  { pattern: /^Just now$/i, replace: 'たった今' },
  { pattern: /^Yesterday$/i, replace: '昨日' },
  { pattern: /^Your Plan:\s*(.*)$/i, replace: '現在のプラン: $1' },
  { pattern: /^Available AI Credits:\s*(.*)$/i, replace: '利用可能な AI クレジット: $1' },
  { pattern: /^Shared with:\s*(.*)$/i, replace: '共有先: $1' },
  { pattern: /^Resets in <1m$/i, replace: '1 分以内にリセットされます' },
  { pattern: /^Resets in (\d+)d (\d+)h$/i, replace: '$1 日 $2 時間後にリセットされます' },
  { pattern: /^Resets in (\d+)d$/i, replace: '$1 日後にリセットされます' },
  { pattern: /^Resets in (\d+)h (\d+)m$/i, replace: '$1 時間 $2 分後にリセットされます' },
  { pattern: /^Resets in (\d+)h$/i, replace: '$1 時間後にリセットされます' },
  { pattern: /^Resets in (\d+)m$/i, replace: '$1 分後にリセットされます' },
  {
    pattern: /^Resets in (?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\.?$/i,
    replace: function(match, d, h, m, s) {
      var parts = [];
      if (d) parts.push(d + ' 日');
      if (h) parts.push(h + ' 時間');
      if (m) parts.push(m + ' 分');
      if (s) parts.push(s + ' 秒');
      return parts.length ? (parts.join(' ') + '後にリセットされます') : match;
    }
  },
  { pattern: /^Step (\d+) of (\d+)$/i, replace: 'ステップ $1 / $2' },
  { pattern: /^Showing (\d+) of (\d+) results$/i, replace: '$1 / $2 件の結果を表示中' },
  { pattern: /^(\d+)\s+files?$/i, replace: '$1 個のファイル' },
  { pattern: /^(\d+)\s+folders?$/i, replace: '$1 個のフォルダー' },
  { pattern: /^(\d+)\s+search(?:es)?$/i, replace: '$1 回の検索' },
  { pattern: /^(\d+)\s+folders?,\s*(\d+)\s+search(?:es)?$/i, replace: '$1 個のフォルダー、$2 回の検索' },
  { pattern: /^(\d+)\s+files?,\s*(\d+)\s+folders?$/i, replace: '$1 個のファイル、$2 個のフォルダー' },
  { pattern: /^(\d+)\s+files?,\s*(\d+)\s+search(?:es)?$/i, replace: '$1 个ファイル、$2 回の検索' },
  { pattern: /^(\d+)\s+files?,\s*(\d+)\s+folders?,\s*(\d+)\s+search(?:es)?$/i, replace: '$1 個のファイル、$2 個のフォルダー、$3 回の検索' },
  { pattern: /^(\d+)\s+seconds?$/i, replace: '$1 秒' },
  { pattern: /^(\d+)\s+minutes?$/i, replace: '$1 分' },
  { pattern: /^(\d+)\s+hours?$/i, replace: '$1 時間' },
  { pattern: /^(\d+)\s+days?$/i, replace: '$1 日' },
  { pattern: /^Wait for task:\s*(.*)$/i, replace: 'タスク待機中: $1' },
  { pattern: /^Timed:\s*(\d+)\s*seconds?$/i, replace: '経過時間: $1 秒' },
  { pattern: /^Unknown:\s*Agent execution terminated due to error\.?$/i, replace: '不明なエラー: エラーのためエージェントの実行が終了しました。' },
  { pattern: /^Agent execution terminated due to error\.?$/i, replace: 'エラーのためエージェントの実行が終了しました。' },
  { pattern: /^Error ID:\s*(.*)$/i, replace: 'エラー ID: $1' },
  {
    pattern: /^Individual quota reached\. Please upgrade your subscription to increase your limits\. Resets in (.*?)\.?$/i,
    replace: function(match, timeStr) {
      var formatted = timeStr
        .replace(/(\d+)d/g, '$1 日 ')
        .replace(/(\d+)h/g, '$1 時間 ')
        .replace(/(\d+)m/g, '$1 分 ')
        .replace(/(\d+)s/g, '$1 秒')
        .trim();
      return '個人の利用上限に達しました。上限を引き上げるにはサブスクリプションをアップグレードしてください。' + formatted + '後にリセットされます。';
    }
  },
  {
    pattern: /^You have used (some|all) of your ([\w\- ]+?) limit, it will fully refresh in (.*?)\.?$/i,
    replace: function(match, usageType, limitType, timeStr) {
      var usage = usageType.toLowerCase() === 'all' ? 'すべて消費しました' : '一部消費しました';
      var limit = limitType.trim();
      if (/weekly/i.test(limit)) limit = '週間';
      else if (/5-hour|5 hour/i.test(limit)) limit = '5 時間';
      else if (/daily/i.test(limit)) limit = '1 日';
      else if (/hourly/i.test(limit)) limit = '1 時間';
      
      var formattedTime = timeStr
        .replace(/(\d+)\s*days?/gi, '$1 日')
        .replace(/(\d+)\s*hours?/gi, '$1 時間')
        .replace(/(\d+)\s*minutes?/gi, '$1 分')
        .replace(/(\d+)\s*seconds?/gi, '$1 秒')
        .replace(/,\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return limit + 'の利用制限を' + usage + '。あと ' + formattedTime + ' で完全にリフレッシュされます。';
    }
  },
  { pattern: /Learn more about (.*)/i, replace: '$1 について詳細を見る' },
  { pattern: /Controls the actions the agent can take\.?/i, replace: 'エージェントが実行できる操作を制御します。' },
  { pattern: /Whether the agent asks you to review its documents\.?/i, replace: 'エージェントが作成したドキュメントの確認をユーザーに求めるかどうかを設定します。' },
];
