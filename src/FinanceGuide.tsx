import ReactMarkdown from 'react-markdown'

const guideMarkdown = `
# 个人理财实操指南

## 1 个人理财计划三阶段

**基石：不间断的自动定投**
每月固定投入标普基金3000元，通过天弘和摩根平台执行自动定投，严格纪律不因市场波动而改变。

**增强：分级式回调加仓**
- 第一级（回撤5%-10%）：取出5k进行小幅加仓
- 第二级（回撤10%-20%）：取出1w进行重点加仓  
- 第三级（回撤≥20%）：分2-3批投入剩余资金

**纪律：年度资产再平衡**
每年卖出超过90%仓位的标普基金，用所得资金买入纯债基金，维持股债9:1配置。此操作能自动"高卖低买"、锁定利润、控制风险。

---

## 2 基金分类与选择

### 基金类型

| 类型 | 股票占比 | 风险等级 |
|------|---------|--------|
| 股票型基金 | ≥80% | 高 |
| 混合型(偏股) | 60%-80% | 中高 |
| 混合型(偏债) | 20%-60% | 中 |
| 债券型基金 | ≤20% | 低 |
| 指数型基金 | 灵活 | 中 |

### A类 vs C类份额

**A类份额**：前端收费，买入时一次性支付申购费，长期持有（≥1年）更划算

**C类份额**：后端收费，按日计提销售服务费（0.1%-0.4%/年），短期投资（少于1年）更省钱

---

## 3 债券为什么会波动？

即使利息固定，债券市价也会变化。原因包括：

1. **利率变化**：央行加息→新债券利息↑→旧债券折价↓
2. **信用风险变化**：发行方经营恶化→债券贬值
3. **市场供需**：买的人多→价格↑；卖的人多→价格↓

基金净值基于债券当前市场价格，即使利息稳定，市价波动→基金净值波动。

---

## 4 可转债的特殊波动性

可转债内含"转股权"期权，除债券属性波动外，期权价值也会剧烈波动。

- **股价大涨**：转股权价值极高，债券跟随股价上涨
- **股价暴跌**：转股权价值归零，债券回落到纯债价值
- **股价震荡**：转股权价值敏感，债券上下反复

---

## 5 如何分析基金？

1. **看基金档案** - 明确投资标的和比例
2. **看收益指标**
   - 长期收益率（3-5年）：稳定性的体现
   - 最大回撤：风险控制水平
   - 夏普比率：收益-风险效率
3. **看费率结构**
   - 申购费/赎回费/管理费/托管费
   - 综合考虑持有时长选择A/C

---

## 6 定投计划四大环节

### 环节一：基础定投（不动摇）
- 每月3000元自动投资
- 天弘日均50元 + 摩根日均100元
- 纯债基金配置稳定器（年化2%左右）

### 环节二：分级加仓（抓机会）
根据标普500指数回撤：
- 回撤5%-10%：加仓5k
- 回撤10%-20%：加仓1w  
- 回撤≥20%：分批投入剩余资金

### 环节三：耐心等待（守纪律）
- 熊市常持续12-18个月
- 需极大的耐心和战略定力
- 使用长期闲置资金应对浮亏

### 环节四：年度再平衡（控风险）
- 强制卖出超90%的标普基金
- 买入纯债基金恢复配置比例
- 自动"高卖低买"锁定利润

---

**祝您理财顺利！** 💰
`

export function FinanceGuide() {
  return (
    <div className="guide-view">
      <div className="guide-markdown">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 className="guide-h1">{children}</h1>,
            h2: ({ children }) => <h2 className="guide-h2">{children}</h2>,
            h3: ({ children }) => <h3 className="guide-h3">{children}</h3>,
            p: ({ children }) => <p className="guide-p">{children}</p>,
            li: ({ children }) => <li className="guide-li">{children}</li>,
            ul: ({ children }) => <ul className="guide-ul">{children}</ul>,
            table: ({ children }) => <table className="guide-table">{children}</table>,
            td: ({ children }) => <td className="guide-td">{children}</td>,
            th: ({ children }) => <th className="guide-th">{children}</th>,
            tr: ({ children }) => <tr className="guide-tr">{children}</tr>,
            hr: () => <hr className="guide-hr" />,
            strong: ({ children }) => <strong>{children}</strong>,
          }}
        >
          {guideMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  )
}
