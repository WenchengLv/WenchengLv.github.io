import { useMemo, useState } from 'react'
import './App.css'

type TaxSettings = {
  brackets: Array<{ threshold: number; rate: number; quickDeduction: number }>
  standardDeduction: number
  additionalDeduction: number
}

const TAX_SETTINGS: TaxSettings = {
  standardDeduction: 5000,
  additionalDeduction: 0,
  brackets: [
    { threshold: 36000, rate: 0.03, quickDeduction: 0 },
    { threshold: 144000, rate: 0.1, quickDeduction: 2520 },
    { threshold: 300000, rate: 0.2, quickDeduction: 16920 },
    { threshold: 420000, rate: 0.25, quickDeduction: 31920 },
    { threshold: 660000, rate: 0.3, quickDeduction: 52920 },
    { threshold: 960000, rate: 0.35, quickDeduction: 85920 },
    { threshold: Infinity, rate: 0.45, quickDeduction: 181920 }
  ]
}

function calculateTax(salary: number, settings: TaxSettings) {
  const taxableIncome = Math.max(0, salary - settings.standardDeduction - settings.additionalDeduction)

  const bracket = settings.brackets.find((b) => taxableIncome <= b.threshold) ?? settings.brackets.at(-1)
  if (!bracket) return { tax: 0, effectiveRate: 0, afterTax: salary }

  const tax = taxableIncome * bracket.rate - bracket.quickDeduction
  const fixedTax = Math.max(0, Number(tax.toFixed(2)))
  return {
    taxableIncome: Number(taxableIncome.toFixed(2)),
    tax: fixedTax,
    afterTax: Number((salary - fixedTax).toFixed(2)),
    effectiveRate: taxableIncome > 0 ? Number(((fixedTax / salary) * 100).toFixed(2)) : 0,
    bracket
  }
}

function App() {
  const [salary, setSalary] = useState('12000')
  const [view, setView] = useState<'home' | 'calculator'>('home')

  const parsedSalary = Number(salary.replace(/,/g, ''))
  const validSalary = Number.isFinite(parsedSalary) ? parsedSalary : 0
  const result = useMemo(() => calculateTax(validSalary, TAX_SETTINGS), [validSalary])

  if (view === 'home') {
    return (
      <div className="app">
        <div className="card">
          <div className="header">
            <div>
              <p className="emoji">🏠</p>
              <div>
                <h1>欢迎</h1>
                <p className="subtitle">请选择“个税计算器”进入</p>
              </div>
            </div>
          </div>
          <div className="form-panel">
            <p className="tip">这是一个 React + TypeScript 个税计算示例页面。</p>
            <button className="index-btn" onClick={() => setView('calculator')}>
              进入个税计算器
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="card">
        <header className="header">
          <div>
            <p className="emoji">💼</p>
            <div>
              <h1>个税计算器</h1>
              <p className="subtitle">React + TypeScript 简易个税计算</p>
            </div>
          </div>
          <button className="index-btn" onClick={() => setView('home')}>
            返回首页
          </button>
        </header>

        <section className="form-panel">
          <label className="label">
            月薪（税前）：
            <input
              type="number"
              value={salary}
              min={0}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="请输入月收入"
            />
          </label>
          <div className="result">
            <div className="item">
              <span>应纳税所得额：</span>
              <strong>{result.taxableIncome?.toLocaleString() ?? 0} 元</strong>
            </div>
            <div className="item">
              <span>应缴个人所得税：</span>
              <strong>{result.tax.toLocaleString()} 元</strong>
            </div>
            <div className="item">
              <span>税后收入：</span>
              <strong>{result.afterTax.toLocaleString()} 元</strong>
            </div>
            <div className="item">
              <span>税负率：</span>
              <strong>{result.effectiveRate.toFixed(2)}%</strong>
            </div>
            <div className="item">
              <span>适用税率：</span>
              <strong>{(result.bracket?.rate ?? 0) * 100}%</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
