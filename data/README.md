# data/ 本土数据源维护说明

这两个数据源的官网有反爬验证或仅以年度报告形式发布，无法稳定自动抓取，
由运营者从官方发布页**手工更新**到这里的 JSON 文件。接口会自动读取，
文件缺失或为空时页面显示"尚未配置"，不会展示编造数据。

## customs-monthly.json — 海关总署月度进出口

来源：海关总署官网 → 统计数据 → 每月发布的《进出口商品总值表》
http://www.customs.gov.cn/customs/302249/zfxxgk/2799825/302274/index.html

每月 7-13 日左右发布上月数据。把当月数字追加到 `entries` 数组（按月份倒序）：

```json
{
  "source": "中国海关总署",
  "unit": "亿元人民币",
  "updatedAt": "2026-06-10",
  "entries": [
    { "period": "2026-05", "exports": 0, "imports": 0, "exportsYoy": "+0.0%", "importsYoy": "-0.0%" }
  ]
}
```

- `exports` / `imports`：当月出口、进口总值（亿元人民币）
- `exportsYoy` / `importsYoy`：同比增速，官方表格里直接有

## sinosure-risk.json — 中国信保国别风险评级

来源：中国出口信用保险公司每年 10 月发布的《国家风险分析报告》
https://www.sinosure.com.cn/ （资讯中心 → 国别风险研究）

评级 1-9，数字越大风险越高。每年报告发布后更新一次：

```json
{
  "source": "中国出口信用保险公司《国家风险分析报告》",
  "edition": "2025 版",
  "scale": "1（风险最低）— 9（风险最高）",
  "countries": [
    { "name": "德国", "rating": 2, "trend": "稳定", "note": "" }
  ]
}
```

- `trend`：稳定 / 上调 / 下调（相对上一年度）
- `note`：选填，一句话说明

## freight-routes.json — SCFI 分航线运价

来源：上海航运交易所 SCFI 页面 https://www.sse.net.cn/index/singleIndex?indexType=scfi
（综合指数已自动实时抓取，分航线运价数值官网为动态加载，需手工填写）

每周五更新。把当周各航线运价填入 `routes`（按重要性排序）：

```json
{
  "source": "上海航运交易所 SCFI 分航线",
  "updatedAt": "2026-06-10",
  "routes": [
    { "route": "欧洲", "unit": "USD/TEU", "rate": 0, "changePct": 0, "note": "" },
    { "route": "美西", "unit": "USD/FEU", "rate": 0, "changePct": 0, "note": "" }
  ]
}
```

- `rate`：当周运价；`changePct`：环比涨跌百分比（正=涨）
- `note`：选填，如"红海绕行推升"
- 不填时页面只显示自动抓取的综合指数，分航线区块隐藏
