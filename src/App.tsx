import { useMemo, useState, useEffect } from 'react'
import { FinanceGuide } from './FinanceGuide'
import { getPageViewStats, recordCalculateClick } from './supabase'
import './App.css'

type TaxSettings = {
  brackets: Array<{ threshold: number; rate: number; quickDeduction: number }>
}

type TaxInput = {
  a1: string
  annualBonus: string
  a2: string
  a3: string
  a4: string
  specialDeduction: string
  specialAdditionalDeduction: string
  otherDeduction: string
  a5: string
  operatingCost: string
  a6: string
  a7: string
  a8: string
  transferCost: string
  a9: string
}

const COMPREHENSIVE_TAX_SETTINGS: TaxSettings = {
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

const BUSINESS_TAX_SETTINGS: TaxSettings = {
  brackets: [
    { threshold: 30000, rate: 0.05, quickDeduction: 0 },
    { threshold: 90000, rate: 0.1, quickDeduction: 1500 },
    { threshold: 300000, rate: 0.2, quickDeduction: 10500 },
    { threshold: 500000, rate: 0.3, quickDeduction: 40500 },
    { threshold: Infinity, rate: 0.35, quickDeduction: 65500 }
  ]
}

const MONTHLY_BONUS_TAX_SETTINGS: TaxSettings = {
  brackets: [
    { threshold: 3000, rate: 0.03, quickDeduction: 0 },
    { threshold: 12000, rate: 0.1, quickDeduction: 210 },
    { threshold: 25000, rate: 0.2, quickDeduction: 1410 },
    { threshold: 35000, rate: 0.25, quickDeduction: 2660 },
    { threshold: 55000, rate: 0.3, quickDeduction: 4410 },
    { threshold: 80000, rate: 0.35, quickDeduction: 7160 },
    { threshold: Infinity, rate: 0.45, quickDeduction: 15160 }
  ]
}

function toFixed2(value: number) {
  return Number(value.toFixed(2))
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(/,/g, ''))
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}

function calculateProgressiveTax(taxableIncome: number, settings: TaxSettings) {
  const taxable = Math.max(0, taxableIncome)

  const bracket = settings.brackets.find((b) => taxable <= b.threshold) ?? settings.brackets[settings.brackets.length - 1]
  if (!bracket) return { taxableIncome: 0, tax: 0, rate: 0, quickDeduction: 0 }

  const tax = taxable * bracket.rate - bracket.quickDeduction
  const fixedTax = Math.max(0, toFixed2(tax))
  return {
    taxableIncome: toFixed2(taxable),
    tax: fixedTax,
    rate: bracket.rate,
    quickDeduction: bracket.quickDeduction
  }
}

function calculateTaxResult(input: TaxInput) {
  const a1 = parseNumber(input.a1)
  const annualBonus = parseNumber(input.annualBonus)
  const a2 = parseNumber(input.a2)
  const a3 = parseNumber(input.a3)
  const a4 = parseNumber(input.a4)
  const specialDeduction = parseNumber(input.specialDeduction)
  const specialAdditionalDeduction = parseNumber(input.specialAdditionalDeduction)
  const otherDeduction = parseNumber(input.otherDeduction)
  const a5 = parseNumber(input.a5)
  const operatingCost = parseNumber(input.operatingCost)
  const a6 = parseNumber(input.a6)
  const a7 = parseNumber(input.a7)
  const a8 = parseNumber(input.a8)
  const transferCost = parseNumber(input.transferCost)
  const a9 = parseNumber(input.a9)

  const mergedSalary = toFixed2(a1 + annualBonus)
  const m1 = toFixed2(mergedSalary)
  const m2 = toFixed2(a2 * 0.8)
  const m3 = toFixed2(a3 * 0.8)
  const m4 = toFixed2(a4 * 0.56)
  const mergedComprehensiveIncome = toFixed2(mergedSalary + a2 + a3 + a4)
  const mergedS14 = toFixed2(
    Math.max(0, m1 + m2 + m3 + m4 - 60000 - specialDeduction - specialAdditionalDeduction - otherDeduction)
  )
  const mergedY14Detail = calculateProgressiveTax(mergedS14, COMPREHENSIVE_TAX_SETTINGS)

  const separateSalaryIncome = toFixed2(a1 + a2 + a3 + a4)
  const separateSalaryTaxableIncome = toFixed2(
    Math.max(0, a1 + m2 + m3 + m4 - 60000 - specialDeduction - specialAdditionalDeduction - otherDeduction)
  )
  const separateSalaryTaxDetail = calculateProgressiveTax(separateSalaryTaxableIncome, COMPREHENSIVE_TAX_SETTINGS)
  const monthlyBonusBase = toFixed2(annualBonus / 12)
  const annualBonusTaxDetail = calculateProgressiveTax(monthlyBonusBase, MONTHLY_BONUS_TAX_SETTINGS)
  const annualBonusSeparateTax = annualBonus > 0
    ? Math.max(0, toFixed2(annualBonus * annualBonusTaxDetail.rate - annualBonusTaxDetail.quickDeduction))
    : 0
  const separateTotalTax = toFixed2(separateSalaryTaxDetail.tax + annualBonusSeparateTax)

  const s5 = toFixed2(Math.max(0, a5 - operatingCost))
  const y5Detail = calculateProgressiveTax(s5, BUSINESS_TAX_SETTINGS)

  const s6 = toFixed2(a6)
  const s7 = toFixed2(a7 <= 4000 ? a7 - 800 : a7 * 0.8)
  const s8 = toFixed2(a8 - transferCost)
  const s9 = toFixed2(a9)
  const y6 = toFixed2(Math.max(0, s6) * 0.2)
  const y7 = toFixed2(Math.max(0, s7) * 0.2)
  const y8 = toFixed2(Math.max(0, s8) * 0.2)
  const y9 = toFixed2(Math.max(0, s9) * 0.2)
  const otherTaxableTotal = toFixed2(
    Math.max(0, s6) + Math.max(0, s7) + Math.max(0, s8) + Math.max(0, s9)
  )
  const y69 = toFixed2(y6 + y7 + y8 + y9)

  return {
    fixedDeduction: 60000,
    specialDeduction,
    specialAdditionalDeduction,
    otherDeduction,
    annualBonus,
    comprehensiveMerged: {
      comprehensiveIncome: mergedComprehensiveIncome,
      salaryIncome: a1,
      annualBonus,
      taxableIncome: mergedS14,
      tax: mergedY14Detail.tax,
      rate: mergedY14Detail.rate,
      quickDeduction: mergedY14Detail.quickDeduction
    },
    comprehensiveSeparate: {
      salaryIncome: separateSalaryIncome,
      annualBonus,
      salaryTaxableIncome: separateSalaryTaxableIncome,
      salaryTax: separateSalaryTaxDetail.tax,
      salaryRate: separateSalaryTaxDetail.rate,
      salaryQuickDeduction: separateSalaryTaxDetail.quickDeduction,
      monthlyBonusBase,
      annualBonusTax: annualBonusSeparateTax,
      annualBonusRate: annualBonusTaxDetail.rate,
      annualBonusQuickDeduction: annualBonusTaxDetail.quickDeduction,
      totalTax: separateTotalTax
    },
    businessIncome: a5,
    businessCost: operatingCost,
    s5,
    y5: y5Detail.tax,
    y5Rate: y5Detail.rate,
    y5QuickDeduction: y5Detail.quickDeduction,
    y6,
    y7,
    y8,
    y9,
    y69,
    otherTaxableTotal
  }
}

function App() {
  const [taxInput, setTaxInput] = useState<TaxInput>({
    a1: '120000',
    annualBonus: '0',
    a2: '0',
    a3: '0',
    a4: '0',
    specialDeduction: '0',
    specialAdditionalDeduction: '0',
    otherDeduction: '0',
    a5: '0',
    operatingCost: '0',
    a6: '0',
    a7: '0',
    a8: '0',
    transferCost: '0',
    a9: '0'
  })
  const [view, setView] = useState<'home' | 'calculator' | 'guide'>('home')
  const [stats, setStats] = useState<any>(null)
  const [operatingCostError, setOperatingCostError] = useState('')
  const [showComprehensiveResult, setShowComprehensiveResult] = useState(false)
  const [showBusinessResult, setShowBusinessResult] = useState(false)
  const [showOtherResult, setShowOtherResult] = useState(false)
  const [comprehensiveResult, setComprehensiveResult] = useState<ReturnType<typeof calculateTaxResult> | null>(null)
  const [businessResult, setBusinessResult] = useState<ReturnType<typeof calculateTaxResult> | null>(null)
  const [otherResult, setOtherResult] = useState<ReturnType<typeof calculateTaxResult> | null>(null)

  // 定时刷新统计数据
  useEffect(() => {
    const loadStats = async () => {
      const data = await getPageViewStats('calculate_click')
      setStats(data)
    }
    
    loadStats()
    const interval = setInterval(loadStats, 5000) // 每5秒刷新一次
    return () => clearInterval(interval)
  }, [])

  const handleInputChange = (key: keyof typeof taxInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setTaxInput((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const handleA5Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextA5 = e.target.value
    const parsedA5 = parseNumber(nextA5)

    setTaxInput((prev) => {
      const currentCost = parseNumber(prev.operatingCost)
      if (currentCost > parsedA5) {
        return { ...prev, a5: nextA5, operatingCost: String(parsedA5) }
      }
      return { ...prev, a5: nextA5 }
    })

    setOperatingCostError('')
  }

  const handleOperatingCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextCost = e.target.value
    const parsedCost = parseNumber(nextCost)
    const parsedA5 = parseNumber(taxInput.a5)

    if (parsedCost > parsedA5) {
      setOperatingCostError('输入错误：成本、费用以及损失不能超过经营所得 A5。')
      return
    }

    setOperatingCostError('')
    setTaxInput((prev) => ({ ...prev, operatingCost: nextCost }))
  }

  const handleCalculateClick = (category: 'comprehensive' | 'business' | 'other') => {
    const latestResult = calculateTaxResult(taxInput)
    if (category === 'comprehensive') {
      setShowComprehensiveResult(true)
      setComprehensiveResult(latestResult)
    }
    if (category === 'business') {
      setShowBusinessResult(true)
      setBusinessResult(latestResult)
    }
    if (category === 'other') {
      setShowOtherResult(true)
      setOtherResult(latestResult)
    }
    recordCalculateClick()
  }

  const calculateClickTotal = useMemo(() => {
    if (!Array.isArray(stats)) return 0
    const clickItem = stats.find((item: any) => item.page_name === 'calculate_click')
    return clickItem?.count || 0
  }, [stats])

  if (view === 'home') {
    return (
      <div className="app">
        <div className="card">
          <div className="header">
            <div>
              <p className="emoji">🏠</p>
              <div>
                <h1>财务工具箱</h1>
                <p className="subtitle">个税计算 / 理财指南</p>
              </div>
            </div>
          </div>
          <div className="feature-grid">
            <div className="feature-item" onClick={() => setView('calculator')}>
              <div className="feature-icon">💼</div>
              <h3>个税计算器</h3>
              <p>快速计算个人所得税及税后收入</p>
            </div>
            <div className="feature-item" onClick={() => setView('guide')}>
              <div className="feature-icon">📚</div>
              <h3>理财指南</h3>
              <p>个人理财计划与基金选择技巧</p>
            </div>
          </div>

          {/* 浏览量统计面板 */}
          <div className="stats-panel">
            <div className="stats-title">📊 计算统计 (Supabase)</div>
            <div className="stat-item">
              <span className="stat-page">🧮 总计算数</span>
              <span className="stat-count">{calculateClickTotal}</span>
            </div>
            {stats === null ? (
              <div className="stats-content">
                <p className="stat-loading">
                  正在加载统计数据...
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (view === 'guide') {
    return (
      <div className="app">
        <div className="card">
          <header className="header">
            <div>
              <p className="emoji">📚</p>
              <div>
                <h1>理财指南</h1>
                <p className="subtitle">个人理财计划与基金选择</p>
              </div>
            </div>
            <button className="index-btn" onClick={() => setView('home')}>
              返回首页
            </button>
          </header>

          <FinanceGuide />
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
          <div className="part-block part-block-primary">
            <h2 className="part-title">第一部分：打工人版</h2>
            <p className="part-subtitle">对应综合所得（工资薪金、劳务报酬、特许权使用费、稿酬）</p>

            <div className="tax-section">
              <h2>第一大类：综合所得（超额累进税率）</h2>
              <div className="field-grid">
                <label className="label">
                  工资、薪金所得（全年，不含年终奖）
                  <input type="number" value={taxInput.a1} min={0} onChange={handleInputChange('a1')} />
                </label>
                <label className="label">
                  年终奖（全年）
                  <input type="number" value={taxInput.annualBonus} min={0} onChange={handleInputChange('annualBonus')} />
                </label>
                <label className="label">
                  劳务报酬所得
                  <input type="number" value={taxInput.a2} min={0} onChange={handleInputChange('a2')} />
                </label>
                <label className="label">
                  特许权使用费所得
                  <input type="number" value={taxInput.a3} min={0} onChange={handleInputChange('a3')} />
                </label>
                <label className="label">
                  稿酬所得
                  <input type="number" value={taxInput.a4} min={0} onChange={handleInputChange('a4')} />
                </label>
                <label className="label">
                  专项扣除（五险一金）
                  <input
                    type="number"
                    value={taxInput.specialDeduction}
                    min={0}
                    onChange={handleInputChange('specialDeduction')}
                  />
                </label>
                <label className="label">
                  专项附加扣除
                  <input
                    type="number"
                    value={taxInput.specialAdditionalDeduction}
                    min={0}
                    onChange={handleInputChange('specialAdditionalDeduction')}
                  />
                </label>
                <label className="label">
                  其他扣除
                  <input type="number" value={taxInput.otherDeduction} min={0} onChange={handleInputChange('otherDeduction')} />
                </label>
              </div>
              <button className="calc-btn" onClick={() => handleCalculateClick('comprehensive')}>
                点击计算综合所得
              </button>
            </div>

            {showComprehensiveResult && comprehensiveResult ? (
              <div className="comparison-grid">
                <div className="result result-card">
                <div className="item item-title">
                  <strong>年终奖并入综合所得</strong>
                </div>
                <div className="item">
                  <span>综合收入</span>
                  <strong>{comprehensiveResult.comprehensiveMerged.comprehensiveIncome.toLocaleString()} 元</strong>
                </div>
                <div className="item">
                  <span>工资、薪金所得（不含年终奖）</span>
                  <strong>{comprehensiveResult.comprehensiveMerged.salaryIncome.toLocaleString()} 元</strong>
                </div>
                <div className="item">
                  <span>年终奖（全年）</span>
                  <strong>{comprehensiveResult.comprehensiveMerged.annualBonus.toLocaleString()} 元</strong>
                </div>
                <div className="item">
                  <span>固定减除费用</span>
                  <strong>{comprehensiveResult.fixedDeduction.toLocaleString()} 元</strong>
                </div>
                <div className="item">
                  <span>专项扣除</span>
                  <strong>{comprehensiveResult.specialDeduction.toLocaleString()} 元</strong>
                </div>
                <div className="item">
                  <span>专项附加扣除</span>
                  <strong>{comprehensiveResult.specialAdditionalDeduction.toLocaleString()} 元</strong>
                </div>
                <div className="item">
                  <span>其他扣除</span>
                  <strong>{comprehensiveResult.otherDeduction.toLocaleString()} 元</strong>
                </div>
                <div className="item">
                  <span>应缴纳所得额</span>
                  <strong>{comprehensiveResult.comprehensiveMerged.taxableIncome.toLocaleString()} 元</strong>
                </div>
                <div className="item">
                  <span>税率/预扣率</span>
                  <strong>{(comprehensiveResult.comprehensiveMerged.rate * 100).toFixed(0)}%</strong>
                </div>
                <div className="item">
                  <span>速算扣除数</span>
                  <strong>{comprehensiveResult.comprehensiveMerged.quickDeduction.toLocaleString()}</strong>
                </div>
                <div className="item">
                  <span>应纳税额</span>
                  <strong>{comprehensiveResult.comprehensiveMerged.tax.toLocaleString()} 元</strong>
                </div>
              </div>

                <div className="result result-card">
                <div className="item item-title">
                  <strong>年终奖单独计税</strong>
                </div>
                <div className="item">
                  <span>工资及其他综合收入</span>
                  <strong>{comprehensiveResult.comprehensiveSeparate.salaryIncome.toLocaleString()} 元</strong>
                </div>
                <div className="item">
                  <span>年终奖（全年）</span>
                  <strong>{comprehensiveResult.comprehensiveSeparate.annualBonus.toLocaleString()} 元</strong>
                </div>
                <div className="item">
                  <span>工资部分应缴纳所得额</span>
                  <strong>{comprehensiveResult.comprehensiveSeparate.salaryTaxableIncome.toLocaleString()} 元</strong>
                </div>
                <div className="item">
                  <span>工资部分税率/速算扣除数</span>
                  <strong>
                    {(comprehensiveResult.comprehensiveSeparate.salaryRate * 100).toFixed(0)}% / {comprehensiveResult.comprehensiveSeparate.salaryQuickDeduction.toLocaleString()}
                  </strong>
                </div>
                <div className="item">
                  <span>工资部分应纳税额</span>
                  <strong>{comprehensiveResult.comprehensiveSeparate.salaryTax.toLocaleString()} 元</strong>
                </div>
                <div className="item">
                  <span>年终奖 ÷ 12</span>
                  <strong>{comprehensiveResult.comprehensiveSeparate.monthlyBonusBase.toLocaleString()} 元</strong>
                </div>
                <div className="item">
                  <span>年终奖税率/速算扣除数</span>
                  <strong>
                    {(comprehensiveResult.comprehensiveSeparate.annualBonusRate * 100).toFixed(0)}% / {comprehensiveResult.comprehensiveSeparate.annualBonusQuickDeduction.toLocaleString()}
                  </strong>
                </div>
                <div className="item">
                  <span>年终奖应纳税额</span>
                  <strong>{comprehensiveResult.comprehensiveSeparate.annualBonusTax.toLocaleString()} 元</strong>
                </div>
                <div className="item">
                  <span>应纳税额合计</span>
                  <strong>{comprehensiveResult.comprehensiveSeparate.totalTax.toLocaleString()} 元</strong>
                </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="part-block part-block-advanced">
            <h2 className="part-title">第二部分：打工人进阶版</h2>
            <p className="part-subtitle">对应经营所得 + 其他所得</p>

            <div className="tax-section">
              <h2>第二大类：经营所得（超额累进税率）</h2>
              <div className="pair-group">
                <div className="pair-fields">
                  <label className="label">
                    经营所得
                    <input type="number" value={taxInput.a5} min={0} onChange={handleA5Change} />
                  </label>
                  <label className="label">
                    成本、费用以及损失
                    <input
                      type="number"
                      value={taxInput.operatingCost}
                      min={0}
                      max={parseNumber(taxInput.a5)}
                      onChange={handleOperatingCostChange}
                      className={operatingCostError ? 'input-error' : ''}
                    />
                  </label>
                </div>
                <p className="pair-note">应缴纳所得额 = 经营所得收入 - 成本、费用及损失</p>
              </div>
              {operatingCostError ? <p className="input-error-text">{operatingCostError}</p> : null}
              <button className="calc-btn" onClick={() => handleCalculateClick('business')}>
                点击计算经营所得
              </button>
            </div>

            {showBusinessResult && businessResult ? (
              <div className="result result-card">
              <div className="item item-title">
                <strong>经营所得结果</strong>
              </div>
              <div className="item">
                <span>经营所得收入</span>
                <strong>{businessResult.businessIncome.toLocaleString()} 元</strong>
              </div>
              <div className="item">
                <span>成本、费用及损失</span>
                <strong>{businessResult.businessCost.toLocaleString()} 元</strong>
              </div>
              <div className="item">
                <span>应缴纳所得额</span>
                <strong>{businessResult.s5.toLocaleString()} 元</strong>
              </div>
              <div className="item">
                <span>税率/预扣率</span>
                <strong>{(businessResult.y5Rate * 100).toFixed(0)}%</strong>
              </div>
              <div className="item">
                <span>速算扣除数</span>
                <strong>{businessResult.y5QuickDeduction.toLocaleString()}</strong>
              </div>
              <div className="item">
                <span>应纳税额</span>
                <strong>{businessResult.y5.toLocaleString()} 元</strong>
              </div>
              </div>
            ) : null}

            <div className="tax-section">
              <h2>第三大类：其他所得（比例税率 20%）</h2>
              <div className="field-grid">
                <label className="label">
                  利息、股息、红利所得
                  <input type="number" value={taxInput.a6} min={0} onChange={handleInputChange('a6')} />
                </label>
                <label className="label">
                  财产租赁所得
                  <input type="number" value={taxInput.a7} min={0} onChange={handleInputChange('a7')} />
                </label>
                <div className="pair-group pair-group-full">
                  <div className="pair-fields">
                    <label className="label">
                      财产转让所得（收入）
                      <input
                        type="number"
                        value={taxInput.a8}
                        min={0}
                        onChange={handleInputChange('a8')}
                        placeholder="输入财产转让收入"
                      />
                    </label>
                    <label className="label">
                      财产原值和合理费用（成本）
                      <input
                        type="number"
                        value={taxInput.transferCost}
                        min={0}
                        onChange={handleInputChange('transferCost')}
                        placeholder="输入财产原值和合理费用"
                      />
                    </label>
                  </div>
                  <p className="pair-note">应缴纳所得额 = 财产转让收入 - 财产原值和合理费用</p>
                </div>
                <label className="label">
                  偶然所得
                  <input type="number" value={taxInput.a9} min={0} onChange={handleInputChange('a9')} />
                </label>
              </div>
              <p className="tip">财产租赁所得按规则计算：不超过4000时，应缴纳税额为收入减去800；大于4000时，应缴纳税额为收入乘以80%。</p>
              <button className="calc-btn" onClick={() => handleCalculateClick('other')}>
                点击计算其他所得
              </button>
            </div>

            {showOtherResult && otherResult ? (
              <div className="result result-card">
              <div className="item item-title">
                <strong>其他所得结果</strong>
              </div>
              <div className="item">
                <span>利息、股息、红利所得税额（20%）</span>
                <strong>{otherResult.y6.toLocaleString()} 元</strong>
              </div>
              <div className="item">
                <span>财产租赁所得税额（20%）</span>
                <strong>{otherResult.y7.toLocaleString()} 元</strong>
              </div>
              <div className="item">
                <span>财产转让所得税额（20%）</span>
                <strong>{otherResult.y8.toLocaleString()} 元</strong>
              </div>
              <div className="item">
                <span>偶然所得税额（20%）</span>
                <strong>{otherResult.y9.toLocaleString()} 元</strong>
              </div>
              <div className="item">
                <span>税额合计</span>
                <strong>{otherResult.y69.toLocaleString()} 元</strong>
              </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="tax-table-panel">
          <div className="tax-reference-note">
            <strong>参考资料：</strong>
            <p>
              个税计算方式参考《中华人民共和国个人所得税法》、《中华人民共和国个人所得税法实施条例》、《国家税务总局关于调整个人取得全年一次性奖金等计算征收个人所得税方法问题的通知》、《财政部 税务总局关于延续实施全年一次性奖金个人所得税政策的公告》。实际税率与口径请以国家税务总局及主管税务机关发布的最新政策文件为准。
            </p>
          </div>

          <h2 className="tax-table-title">税率表一（综合所得适用）</h2>

          <div className="tax-table-card">
            <h3>综合所得超额累进税率与速算扣除数</h3>
            <div className="tax-table-wrap">
              <table className="tax-rate-table">
                <thead>
                  <tr>
                    <th>级数</th>
                    <th>全年应纳税所得额</th>
                    <th>税率（%）</th>
                    <th>速算扣除数</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>不超过36000元的</td>
                    <td>3</td>
                    <td>0</td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>超过36000元至144000元的部分</td>
                    <td>10</td>
                    <td>2520</td>
                  </tr>
                  <tr>
                    <td>3</td>
                    <td>超过144000元至300000元的部分</td>
                    <td>20</td>
                    <td>16920</td>
                  </tr>
                  <tr>
                    <td>4</td>
                    <td>超过300000元至420000元的部分</td>
                    <td>25</td>
                    <td>31920</td>
                  </tr>
                  <tr>
                    <td>5</td>
                    <td>超过420000元至660000元的部分</td>
                    <td>30</td>
                    <td>52920</td>
                  </tr>
                  <tr>
                    <td>6</td>
                    <td>超过660000元至960000元的部分</td>
                    <td>35</td>
                    <td>85920</td>
                  </tr>
                  <tr>
                    <td>7</td>
                    <td>超过960000元的部分</td>
                    <td>45</td>
                    <td>181920</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="tax-table-card">
            <h3>工资、薪金所得预扣预缴税率表（按全月应纳税所得额）</h3>
            <div className="tax-table-wrap">
              <table className="tax-rate-table">
                <thead>
                  <tr>
                    <th>级数</th>
                    <th>全月应纳税所得额</th>
                    <th>税率（%）</th>
                    <th>速算扣除数</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>不超过3000元的</td>
                    <td>3</td>
                    <td>0</td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>超过3000元至12000元的部分</td>
                    <td>10</td>
                    <td>210</td>
                  </tr>
                  <tr>
                    <td>3</td>
                    <td>超过12000元至25000元的部分</td>
                    <td>20</td>
                    <td>1410</td>
                  </tr>
                  <tr>
                    <td>4</td>
                    <td>超过25000元至35000元的部分</td>
                    <td>25</td>
                    <td>2660</td>
                  </tr>
                  <tr>
                    <td>5</td>
                    <td>超过35000元至55000元的部分</td>
                    <td>30</td>
                    <td>4410</td>
                  </tr>
                  <tr>
                    <td>6</td>
                    <td>超过55000元至80000元的部分</td>
                    <td>35</td>
                    <td>7160</td>
                  </tr>
                  <tr>
                    <td>7</td>
                    <td>超过80000元的部分</td>
                    <td>45</td>
                    <td>15160</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <h2 className="tax-table-title">税率表二（经营所得适用）</h2>

          <div className="tax-table-card">
            <h3>经营所得超额累进税率与速算扣除数</h3>
            <div className="tax-table-wrap">
              <table className="tax-rate-table">
                <thead>
                  <tr>
                    <th>级数</th>
                    <th>全年应纳税所得额</th>
                    <th>税率（%）</th>
                    <th>速算扣除数</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>不超过30000元的</td>
                    <td>5</td>
                    <td>0</td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>超过30000元至90000元的部分</td>
                    <td>10</td>
                    <td>1500</td>
                  </tr>
                  <tr>
                    <td>3</td>
                    <td>超过90000元至300000元的部分</td>
                    <td>20</td>
                    <td>10500</td>
                  </tr>
                  <tr>
                    <td>4</td>
                    <td>超过300000元至500000元的部分</td>
                    <td>30</td>
                    <td>40500</td>
                  </tr>
                  <tr>
                    <td>5</td>
                    <td>超过500000元的部分</td>
                    <td>35</td>
                    <td>65500</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
