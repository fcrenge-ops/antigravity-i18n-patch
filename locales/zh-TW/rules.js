/**
 * 繁體中文 (zh-TW) 動態正則規則
 * 用於處理帶動態數字、時間、相對日期、配額等複雜文字
 */
module.exports = [
  { pattern: /^Thought for (\d+)(s|m|h)$/i, replace: '思考耗時 $1$2' },
  { pattern: /^Worked for (\d+)(s|m|h)$/i, replace: '工作耗時 $1$2' },
  { pattern: /^Updated\s+(\d{1,2}:\d{2})$/i, replace: '更新於 $1' },
  { pattern: /^(\d+)\s+commands?$/i, replace: '$1 條指令' },
  { pattern: /^(\d+)\s+conversations?$/i, replace: '$1 個對話' },
  { pattern: /^(\d+)\s+tasks?$/i, replace: '$1 個任務' },
  { pattern: /^(\d+)\s+files?\s+changed$/i, replace: '$1 個檔案已變更' },
  { pattern: /^(\d+)\s+subagents?$/i, replace: '$1 個子代理' },
  { pattern: /^(\d+)\s*m\s+ago$/i, replace: '$1 分鐘前' },
  { pattern: /^(\d+)\s*h\s+ago$/i, replace: '$1 小時前' },
  { pattern: /^(\d+)\s*d\s+ago$/i, replace: '$1 天前' },
  { pattern: /^(\d+)\s+days?\s+ago$/i, replace: '$1 天前' },
  { pattern: /^(\d+)\s+hours?\s+ago$/i, replace: '$1 小時前' },
  { pattern: /^(\d+)\s+minutes?\s+ago$/i, replace: '$1 分鐘前' },
  { pattern: /^(\d+)\s+seconds?\s+ago$/i, replace: '$1 秒前' },
  { pattern: /^Just now$/i, replace: '剛剛' },
  { pattern: /^Yesterday$/i, replace: '昨天' },
  { pattern: /^Your Plan:\s*(.*)$/i, replace: '目前方案: $1' },
  { pattern: /^Available AI Credits:\s*(.*)$/i, replace: '可用 AI 點數: $1' },
  { pattern: /^Shared with:\s*(.*)$/i, replace: '共用對象: $1' },
  { pattern: /^Resets in <1m$/i, replace: '將在 1 分鐘內重設' },
  { pattern: /^Resets in (\d+)d (\d+)h$/i, replace: '將在 $1 天 $2 小時後重設' },
  { pattern: /^Resets in (\d+)d$/i, replace: '將在 $1 天後重設' },
  { pattern: /^Resets in (\d+)h (\d+)m$/i, replace: '將在 $1 小時 $2 分鐘後重設' },
  { pattern: /^Resets in (\d+)h$/i, replace: '將在 $1 小時後重設' },
  { pattern: /^Resets in (\d+)m$/i, replace: '將在 $1 分鐘後重設' },
  {
    pattern: /^Resets in (?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\.?$/i,
    replace: function(match, d, h, m, s) {
      var parts = [];
      if (d) parts.push(d + ' 天');
      if (h) parts.push(h + ' 小時');
      if (m) parts.push(m + ' 分鐘');
      if (s) parts.push(s + ' 秒');
      return parts.length ? ('將在 ' + parts.join(' ') + '後重設') : match;
    }
  },
  { pattern: /^Step (\d+) of (\d+)$/i, replace: '步驟 $1 / $2' },
  { pattern: /^Showing (\d+) of (\d+) results$/i, replace: '顯示第 $1 / $2 項結果' },
  { pattern: /^(\d+)\s+files?$/i, replace: '$1 個檔案' },
  { pattern: /^(\d+)\s+folders?$/i, replace: '$1 個資料夾' },
  { pattern: /^(\d+)\s+search(?:es)?$/i, replace: '$1 次搜尋' },
  { pattern: /^(\d+)\s+folders?,\s*(\d+)\s+search(?:es)?$/i, replace: '$1 個資料夾，$2 次搜尋' },
  { pattern: /^(\d+)\s+files?,\s*(\d+)\s+folders?$/i, replace: '$1 個檔案，$2 個資料夾' },
  { pattern: /^(\d+)\s+files?,\s*(\d+)\s+search(?:es)?$/i, replace: '$1 個檔案，$2 次搜尋' },
  { pattern: /^(\d+)\s+files?,\s*(\d+)\s+folders?,\s*(\d+)\s+search(?:es)?$/i, replace: '$1 個檔案，$2 個資料夾，$3 次搜尋' },
  { pattern: /^(\d+)\s+seconds?$/i, replace: '$1 秒' },
  { pattern: /^(\d+)\s+minutes?$/i, replace: '$1 分鐘' },
  { pattern: /^(\d+)\s+hours?$/i, replace: '$1 小時' },
  { pattern: /^(\d+)\s+days?$/i, replace: '$1 天' },
  { pattern: /^Wait for task:\s*(.*)$/i, replace: '等待任務: $1' },
  { pattern: /^Timed:\s*(\d+)\s*seconds?$/i, replace: '已耗時: $1 秒' },
  { pattern: /^Unknown:\s*Agent execution terminated due to error\.?$/i, replace: '未知錯誤: 智慧代理執行因錯誤終止。' },
  { pattern: /^Agent execution terminated due to error\.?$/i, replace: '智慧代理執行因錯誤終止。' },
  { pattern: /^Error ID:\s*(.*)$/i, replace: '錯誤 ID: $1' },
  {
    pattern: /^Individual quota reached\. Please upgrade your subscription to increase your limits\. Resets in (.*?)\.?$/i,
    replace: function(match, timeStr) {
      var formatted = timeStr
        .replace(/(\d+)d/g, '$1 天 ')
        .replace(/(\d+)h/g, '$1 小時 ')
        .replace(/(\d+)m/g, '$1 分鐘 ')
        .replace(/(\d+)s/g, '$1 秒')
        .trim();
      return '已達個人額度上限。請升級訂閱以提升額度。將在 ' + formatted + '後重設。';
    }
  },
  {
    pattern: /^You have used (some|all) of your ([\w\- ]+?) limit, it will fully refresh in (.*?)\.?$/i,
    replace: function(match, usageType, limitType, timeStr) {
      var usage = usageType.toLowerCase() === 'all' ? '已用盡' : '已使用部分';
      var limit = limitType.trim();
      if (/weekly/i.test(limit)) limit = '週';
      else if (/5-hour|5 hour/i.test(limit)) limit = '5 小時';
      else if (/daily/i.test(limit)) limit = '日';
      else if (/hourly/i.test(limit)) limit = '小時';
      
      var formattedTime = timeStr
        .replace(/(\d+)\s*days?/gi, '$1 天')
        .replace(/(\d+)\s*hours?/gi, '$1 小時')
        .replace(/(\d+)\s*minutes?/gi, '$1 分鐘')
        .replace(/(\d+)\s*seconds?/gi, '$1 秒')
        .replace(/,\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      var limitWithSpace = /^\d/.test(limit) ? (' ' + limit) : limit;
      return '您' + usage + limitWithSpace + '額度，將在 ' + formattedTime + ' 後完全重新整理。';
    }
  },
  { pattern: /Learn more about (.*)/i, replace: '了解更多關於 $1 的資訊' },
  { pattern: /Controls the actions the agent can take\.?/i, replace: '控制智慧代理可以執行的操作。' },
  { pattern: /Whether the agent asks you to review its documents\.?/i, replace: '智慧代理生成文件成品時是否需要您進行審查。' },
];
