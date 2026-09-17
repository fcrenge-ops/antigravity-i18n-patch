/**
 * 简体中文 (zh-CN) 动态正则规则
 * 用于处理带动态数字、时间、相对日期、配额等复杂文本
 */
module.exports = [
  { pattern: /^Thought for (\d+)(s|m|h)$/i, replace: '思考耗时 $1$2' },
  { pattern: /^Worked for (\d+)(s|m|h)$/i, replace: '工作耗时 $1$2' },
  { pattern: /^Updated\s+(\d{1,2}:\d{2})$/i, replace: '更新于 $1' },
  { pattern: /^(\d+)\s+commands?$/i, replace: '$1 条命令' },
  { pattern: /^(\d+)\s+conversations?$/i, replace: '$1 个对话' },
  { pattern: /^(\d+)\s+tasks?$/i, replace: '$1 个任务' },
  { pattern: /^(\d+)\s+files?\s+changed$/i, replace: '$1 个文件已更改' },
  { pattern: /^(\d+)\s+subagents?$/i, replace: '$1 个子智能体' },
  { pattern: /^(\d+)\s*m\s+ago$/i, replace: '$1 分钟前' },
  { pattern: /^(\d+)\s*h\s+ago$/i, replace: '$1 小时前' },
  { pattern: /^(\d+)\s*d\s+ago$/i, replace: '$1 天前' },
  { pattern: /^(\d+)\s+days?\s+ago$/i, replace: '$1 天前' },
  { pattern: /^(\d+)\s+hours?\s+ago$/i, replace: '$1 小时前' },
  { pattern: /^(\d+)\s+minutes?\s+ago$/i, replace: '$1 分钟前' },
  { pattern: /^(\d+)\s+seconds?\s+ago$/i, replace: '$1 秒前' },
  { pattern: /^Just now$/i, replace: '刚刚' },
  { pattern: /^Yesterday$/i, replace: '昨天' },
  { pattern: /^Your Plan:\s*(.*)$/i, replace: '当前方案: $1' },
  { pattern: /^Available AI Credits:\s*(.*)$/i, replace: '可用 AI 积分: $1' },
  { pattern: /^Shared with:\s*(.*)$/i, replace: '共享对象: $1' },
  { pattern: /^Resets in <1m$/i, replace: '将在 1 分钟内重置' },
  { pattern: /^Resets in (\d+)d (\d+)h$/i, replace: '将在 $1 天 $2 小时后重置' },
  { pattern: /^Resets in (\d+)d$/i, replace: '将在 $1 天后重置' },
  { pattern: /^Resets in (\d+)h (\d+)m$/i, replace: '将在 $1 小时 $2 分钟后重置' },
  { pattern: /^Resets in (\d+)h$/i, replace: '将在 $1 小时后重置' },
  { pattern: /^Resets in (\d+)m$/i, replace: '将在 $1 分钟后重置' },
  {
    pattern: /^Resets in (?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\.?$/i,
    replace: function(match, d, h, m, s) {
      var parts = [];
      if (d) parts.push(d + ' 天');
      if (h) parts.push(h + ' 小时');
      if (m) parts.push(m + ' 分钟');
      if (s) parts.push(s + ' 秒');
      return parts.length ? ('将在 ' + parts.join(' ') + '后重置') : match;
    }
  },
  { pattern: /^Step (\d+) of (\d+)$/i, replace: '步骤 $1 / $2' },
  { pattern: /^Showing (\d+) of (\d+) results$/i, replace: '显示第 $1 / $2 项结果' },
  { pattern: /^(\d+)\s+files?$/i, replace: '$1 个文件' },
  { pattern: /^(\d+)\s+folders?$/i, replace: '$1 个文件夹' },
  { pattern: /^(\d+)\s+search(?:es)?$/i, replace: '$1 次搜索' },
  { pattern: /^(\d+)\s+folders?,\s*(\d+)\s+search(?:es)?$/i, replace: '$1 个文件夹，$2 次搜索' },
  { pattern: /^(\d+)\s+files?,\s*(\d+)\s+folders?$/i, replace: '$1 个文件，$2 个文件夹' },
  { pattern: /^(\d+)\s+files?,\s*(\d+)\s+search(?:es)?$/i, replace: '$1 个文件，$2 次搜索' },
  { pattern: /^(\d+)\s+files?,\s*(\d+)\s+folders?,\s*(\d+)\s+search(?:es)?$/i, replace: '$1 个文件，$2 个文件夹，$3 次搜索' },
  { pattern: /^(\d+)\s+seconds?$/i, replace: '$1 秒' },
  { pattern: /^(\d+)\s+minutes?$/i, replace: '$1 分钟' },
  { pattern: /^(\d+)\s+hours?$/i, replace: '$1 小时' },
  { pattern: /^(\d+)\s+days?$/i, replace: '$1 天' },
  { pattern: /^Wait for task:\s*(.*)$/i, replace: '等待任务: $1' },
  { pattern: /^Timed:\s*(\d+)\s*seconds?$/i, replace: '已耗时: $1 秒' },
  { pattern: /^Unknown:\s*Agent execution terminated due to error\.?$/i, replace: '未知错误: 智能体执行因错误终止。' },
  { pattern: /^Agent execution terminated due to error\.?$/i, replace: '智能体执行因错误终止。' },
  { pattern: /^Error ID:\s*(.*)$/i, replace: '错误 ID: $1' },
  {
    pattern: /^Individual quota reached\. Please upgrade your subscription to increase your limits\. Resets in (.*?)\.?$/i,
    replace: function(match, timeStr) {
      var formatted = timeStr
        .replace(/(\d+)d/g, '$1 天 ')
        .replace(/(\d+)h/g, '$1 小时 ')
        .replace(/(\d+)m/g, '$1 分钟 ')
        .replace(/(\d+)s/g, '$1 秒')
        .trim();
      return '已达个人配额上限。请升级订阅以提升额度。将在 ' + formatted + '后重置。';
    }
  },
  {
    pattern: /^You have used (some|all) of your ([\w\- ]+?) limit, it will fully refresh in (.*?)\.?$/i,
    replace: function(match, usageType, limitType, timeStr) {
      var usage = usageType.toLowerCase() === 'all' ? '已用尽' : '已使用部分';
      var limit = limitType.trim();
      if (/weekly/i.test(limit)) limit = '周';
      else if (/5-hour|5 hour/i.test(limit)) limit = '5 小时';
      else if (/daily/i.test(limit)) limit = '日';
      else if (/hourly/i.test(limit)) limit = '小时';
      
      var formattedTime = timeStr
        .replace(/(\d+)\s*days?/gi, '$1 天')
        .replace(/(\d+)\s*hours?/gi, '$1 小时')
        .replace(/(\d+)\s*minutes?/gi, '$1 分钟')
        .replace(/(\d+)\s*seconds?/gi, '$1 秒')
        .replace(/,\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      var limitWithSpace = /^\d/.test(limit) ? (' ' + limit) : limit;
      return '您' + usage + limitWithSpace + '配额，将在 ' + formattedTime + ' 后完全刷新。';
    }
  },
  { pattern: /Learn more about (.*)/i, replace: '了解更多关于 $1 的信息' },
  { pattern: /Controls the actions the agent can take\.?/i, replace: '控制智能体可以执行的操作。' },
  { pattern: /Whether the agent asks you to review its documents\.?/i, replace: '智能体生成文档工件时是否需要您进行审查。' },
];
