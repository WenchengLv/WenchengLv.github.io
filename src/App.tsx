import { useMemo, useState, useEffect } from 'react'
import { FinanceGuide } from './FinanceGuide'
import type { Session } from '@supabase/supabase-js'
import {
  getCurrentSession,
  getPageViewStats,
  onAuthStateChange,
  recordCalculateClick,
  sendPasswordResetEmail,
  signInWithPassword,
  signOutUser,
  signUpWithPassword,
  supabase
  ,updateUserPassword
} from './supabase'
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

type InsuranceRates = {
  pension: number
  medical: number
  unemployment: number
  injury: number
  housingFund: number
}

type HousingRentTier = 'none' | 'tier1' | 'tier2' | 'tier3'

type SpecialAdditionalDeductionConfig = {
  childEducationCount: string
  infantCareCount: string
  elderlySupport: boolean
  continuingEducationDegree: boolean
  continuingEducationSkill: boolean
  seriousIllnessMedical: string
  housingLoanInterest: boolean
  housingRentTier: HousingRentTier
}

type OtherDeductionConfig = {
  enterpriseAnnuity: string
  commercialHealthInsurance: string
  commercialPensionInsurance: string
}

type ComprehensiveCashBreakdown = {
  totalIncome: number
  pensionPersonalAccount: number
  medicalInsurancePersonal: number
  unemploymentInsurancePersonal: number
  housingFundPersonalAccount: number
  enterpriseAnnuityPersonalAccount: number
  commercialHealthInsurance: number
  personalPension: number
  mergedCashInHand: number
  separateCashInHand: number
}

type FourFundColumn = {
  id: number
  contributionBase: string
  contributionYears: string
  pensionRate: string
  medicalRate: string
  housingFundRate: string
  personalPensionAmount: string
}

type AuthMode = 'signin' | 'signup' | 'forgot'

const DEFAULT_INSURANCE_RATES: InsuranceRates = {
  pension: 8,
  medical: 2,
  unemployment: 0.5,
  injury: 0,
  housingFund: 5
}

const DEFAULT_SPECIAL_ADDITIONAL_DEDUCTION_CONFIG: SpecialAdditionalDeductionConfig = {
  childEducationCount: '0',
  infantCareCount: '0',
  elderlySupport: false,
  continuingEducationDegree: false,
  continuingEducationSkill: false,
  seriousIllnessMedical: '0',
  housingLoanInterest: false,
  housingRentTier: 'none'
}

const DEFAULT_OTHER_DEDUCTION_CONFIG: OtherDeductionConfig = {
  enterpriseAnnuity: '0',
  commercialHealthInsurance: '0',
  commercialPensionInsurance: '0'
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

function createDefaultFourFundColumn(id: number): FourFundColumn {
  return {
    id,
    contributionBase: '10000',
    contributionYears: '1',
    pensionRate: '8',
    medicalRate: '2',
    housingFundRate: '5',
    personalPensionAmount: '0'
  }
}

function toFixed2(value: number) {
  return Number(value.toFixed(2))
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(/,/g, ''))
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}

function mapAuthErrorMessage(message: string) {
  const normalized = message.trim().toLowerCase()

  if (normalized === 'invalid login credentials') {
    return '邮箱或密码错误。'
  }

  if (normalized === 'email not confirmed') {
    return '邮箱尚未验证，请先前往邮箱完成验证。'
  }

  if (normalized === 'user already registered') {
    return '该邮箱已注册，请直接登录。'
  }

  if (normalized === 'email rate limit exceeded') {
    return '邮件发送过于频繁，请稍后再试。'
  }

  if (normalized === 'error sending confirmation email') {
    return '确认邮件发送失败，请检查邮件服务配置或稍后再试。'
  }

  if (normalized === 'new password should be different from the old password') {
    return '新密码不能与旧密码相同。'
  }

  if (normalized === 'same password cannot be used') {
    return '新密码不能与旧密码相同。'
  }

  if (normalized.includes('password should be at least')) {
    return '密码长度不足，请至少输入 6 位。'
  }

  return message
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
  const [authMode, setAuthMode] = useState<AuthMode>('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmNextPassword, setConfirmNextPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [showAuthPanel, setShowAuthPanel] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordModalMode, setPasswordModalMode] = useState<'recovery' | 'authenticated'>('authenticated')
  const [session, setSession] = useState<Session | null>(null)

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
  const [view, setView] = useState<'home' | 'calculator' | 'guide' | 'fourFund'>('home')
  const [stats, setStats] = useState<any>(null)
  const [operatingCostError, setOperatingCostError] = useState('')
  const [showComprehensiveResult, setShowComprehensiveResult] = useState(false)
  const [showBusinessResult, setShowBusinessResult] = useState(false)
  const [showOtherResult, setShowOtherResult] = useState(false)
  const [comprehensiveResult, setComprehensiveResult] = useState<ReturnType<typeof calculateTaxResult> | null>(null)
  const [comprehensiveCashBreakdown, setComprehensiveCashBreakdown] = useState<ComprehensiveCashBreakdown | null>(null)
  const [businessResult, setBusinessResult] = useState<ReturnType<typeof calculateTaxResult> | null>(null)
  const [otherResult, setOtherResult] = useState<ReturnType<typeof calculateTaxResult> | null>(null)
  const [monthlySalary, setMonthlySalary] = useState(() => String(toFixed2(parseNumber('120000') / 12)))
  const [annualSalary, setAnnualSalary] = useState('120000')
  const [showSpecialDeductionConfig, setShowSpecialDeductionConfig] = useState(false)
  const [showSpecialAdditionalDeductionConfig, setShowSpecialAdditionalDeductionConfig] = useState(false)
  const [showOtherDeductionConfig, setShowOtherDeductionConfig] = useState(false)
  const [insuranceRates, setInsuranceRates] = useState<InsuranceRates>(DEFAULT_INSURANCE_RATES)
  const [specialAdditionalConfig, setSpecialAdditionalConfig] = useState<SpecialAdditionalDeductionConfig>(
    DEFAULT_SPECIAL_ADDITIONAL_DEDUCTION_CONFIG
  )
  const [otherDeductionConfig, setOtherDeductionConfig] = useState<OtherDeductionConfig>(DEFAULT_OTHER_DEDUCTION_CONFIG)
  const [fourFundColumns, setFourFundColumns] = useState<FourFundColumn[]>([createDefaultFourFundColumn(1)])
  const [nextFourFundColumnId, setNextFourFundColumnId] = useState(2)
  const isAuthenticated = Boolean(session?.user)
  const currentAccountName = useMemo(() => {
    const accountByMetadata = session?.user?.user_metadata?.account_name
    if (typeof accountByMetadata === 'string' && accountByMetadata.trim()) {
      return accountByMetadata.trim()
    }

    const email = session?.user?.email ?? ''
    if (!email) return ''
    const localPart = email.split('@')[0] ?? ''
    return localPart || ''
  }, [session])

  const getPasswordRedirectUrl = () => {
    if (typeof window === 'undefined') return undefined
    return `${window.location.origin}${window.location.pathname}`
  }

  const isRecoverySession = () => {
    if (typeof window === 'undefined') return false
    const search = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    return search.get('type') === 'recovery' || hash.get('type') === 'recovery'
  }

  const clearAuthUrlParams = () => {
    if (typeof window === 'undefined') return
    const cleanUrl = `${window.location.origin}${window.location.pathname}`
    window.history.replaceState({}, document.title, cleanUrl)
  }

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      const { data, error } = await getCurrentSession()

      if (!mounted) return

      if (error && supabase) {
        setAuthError(mapAuthErrorMessage(error.message))
      }
      setSession(data.session)
      if (isRecoverySession()) {
        setPasswordModalMode('recovery')
        setShowPasswordModal(true)
      }
      setAuthLoading(false)
    }

    initAuth()

    const { data } = onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') {
        setAuthError('')
        setAuthMessage('请输入新密码。')
        setPasswordModalMode('recovery')
        setShowPasswordModal(true)
        setShowAuthPanel(false)
      }
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  // 定时刷新统计数据
  useEffect(() => {
    if (!supabase) {
      setStats(null)
      return
    }

    const loadStats = async () => {
      const data = await getPageViewStats('calculate_click')
      setStats(data)
    }
    
    loadStats()
    const interval = setInterval(loadStats, 5000) // 每5秒刷新一次
    return () => clearInterval(interval)
  }, [isAuthenticated])

  useEffect(() => {
    const base = toFixed2((parseNumber(annualSalary) + parseNumber(taxInput.annualBonus)) / 12)
    const totalRate =
      insuranceRates.pension +
      insuranceRates.medical +
      insuranceRates.unemployment +
      insuranceRates.injury +
      insuranceRates.housingFund
    const monthlyDeduction = base * (totalRate / 100)
    const annualDeduction = Math.round(monthlyDeduction * 12)
    setTaxInput((prev) => ({ ...prev, specialDeduction: String(annualDeduction) }))
  }, [annualSalary, taxInput.annualBonus, insuranceRates])

  useEffect(() => {
    const childEducation = parseNumber(specialAdditionalConfig.childEducationCount) * 2000 * 12
    const infantCare = parseNumber(specialAdditionalConfig.infantCareCount) * 2000 * 12
    const elderlySupport = specialAdditionalConfig.elderlySupport ? 3000 * 12 : 0
    const continuingEducation =
      (specialAdditionalConfig.continuingEducationDegree ? 400 * 12 : 0) +
      (specialAdditionalConfig.continuingEducationSkill ? 3600 : 0)
    const seriousIllnessMedical = Math.min(
      80000,
      Math.max(0, parseNumber(specialAdditionalConfig.seriousIllnessMedical) - 15000)
    )
    const housingLoanInterest = specialAdditionalConfig.housingLoanInterest ? 1000 * 12 : 0
    const housingRent =
      specialAdditionalConfig.housingRentTier === 'tier1'
        ? 1500 * 12
        : specialAdditionalConfig.housingRentTier === 'tier2'
          ? 1100 * 12
          : specialAdditionalConfig.housingRentTier === 'tier3'
            ? 800 * 12
            : 0
    const annualTotal = toFixed2(
      childEducation +
        infantCare +
        elderlySupport +
        continuingEducation +
        seriousIllnessMedical +
        housingLoanInterest +
        housingRent
    )

    setTaxInput((prev) => ({ ...prev, specialAdditionalDeduction: String(annualTotal) }))
  }, [specialAdditionalConfig])

  useEffect(() => {
    const enterpriseAnnuity = parseNumber(otherDeductionConfig.enterpriseAnnuity)
    const commercialHealthInsurance = Math.min(2400, parseNumber(otherDeductionConfig.commercialHealthInsurance))
    const commercialPensionInsurance = Math.min(12000, parseNumber(otherDeductionConfig.commercialPensionInsurance))
    const annualTotal = toFixed2(enterpriseAnnuity + commercialHealthInsurance + commercialPensionInsurance)

    setTaxInput((prev) => ({ ...prev, otherDeduction: String(annualTotal) }))
  }, [otherDeductionConfig])

  const handleInputChange = (key: keyof typeof taxInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setTaxInput((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const handleMonthlySalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextMonthly = e.target.value
    const parsedMonthly = parseNumber(nextMonthly)
    setMonthlySalary(nextMonthly)
    setAnnualSalary(String(toFixed2(parsedMonthly * 12)))
    setTaxInput((prev) => ({
      ...prev,
      a1: String(toFixed2(parsedMonthly * 12))
    }))
  }

  const handleAnnualSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextAnnual = e.target.value
    const parsedAnnual = parseNumber(nextAnnual)
    setAnnualSalary(nextAnnual)
    setMonthlySalary(String(toFixed2(parsedAnnual / 12)))
    setTaxInput((prev) => ({
      ...prev,
      a1: String(toFixed2(parsedAnnual))
    }))
  }

  const handleInsuranceRateChange =
    (key: keyof InsuranceRates) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(e.target.value)
      if (!Number.isFinite(parsed)) {
        return
      }

      let next = parsed
      if (key === 'housingFund') {
        next = Math.min(12, Math.max(5, parsed))
      } else {
        next = Math.max(0, parsed)
      }

      setInsuranceRates((prev) => ({ ...prev, [key]: next }))
    }

  const handleAdditionalDeductionCountChange =
    (key: 'childEducationCount' | 'infantCareCount' | 'seriousIllnessMedical') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSpecialAdditionalConfig((prev) => ({ ...prev, [key]: e.target.value }))
    }

  const handleAdditionalDeductionCheckboxChange =
    (
      key:
        | 'elderlySupport'
        | 'housingLoanInterest'
        | 'continuingEducationDegree'
        | 'continuingEducationSkill'
    ) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSpecialAdditionalConfig((prev) => ({ ...prev, [key]: e.target.checked }))
    }

  const handleHousingRentTierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value as HousingRentTier
    setSpecialAdditionalConfig((prev) => ({ ...prev, housingRentTier: nextValue }))
  }

  const handleOtherDeductionChange =
    (key: keyof OtherDeductionConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setOtherDeductionConfig((prev) => ({ ...prev, [key]: e.target.value }))
    }

  const handleFourFundInputChange =
    (id: number, key: keyof Omit<FourFundColumn, 'id'>) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setFourFundColumns((prev) => prev.map((col) => (col.id === id ? { ...col, [key]: value } : col)))
    }

  const handleAddFourFundColumn = () => {
    setFourFundColumns((prev) => [...prev, createDefaultFourFundColumn(nextFourFundColumnId)])
    setNextFourFundColumnId((prev) => prev + 1)
  }

  const handleRemoveFourFundColumn = (id: number) => {
    setFourFundColumns((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((col) => col.id !== id)
    })
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
      const totalIncome = toFixed2(
        parseNumber(annualSalary) +
          parseNumber(taxInput.annualBonus) +
          parseNumber(taxInput.a2) +
          parseNumber(taxInput.a3) +
          parseNumber(taxInput.a4)
      )
      const pensionPersonalAccount = toFixed2(contributionBase * (insuranceRates.pension / 100) * 12)
      const medicalInsurancePersonal = toFixed2(contributionBase * (insuranceRates.medical / 100) * 12)
      const unemploymentInsurancePersonal = toFixed2(contributionBase * (insuranceRates.unemployment / 100) * 12)
      const housingFundPersonalAccount = toFixed2(contributionBase * (insuranceRates.housingFund / 100) * 12)
      const enterpriseAnnuityPersonalAccount = toFixed2(otherDeductionSummary.enterpriseAnnuity)
      const commercialHealthInsurance = toFixed2(otherDeductionSummary.commercialHealthInsurance)
      const personalPension = toFixed2(otherDeductionSummary.commercialPensionInsurance)

      setShowComprehensiveResult(true)
      setComprehensiveResult(latestResult)
      setComprehensiveCashBreakdown({
        totalIncome,
        pensionPersonalAccount,
        medicalInsurancePersonal,
        unemploymentInsurancePersonal,
        housingFundPersonalAccount,
        enterpriseAnnuityPersonalAccount,
        commercialHealthInsurance,
        personalPension,
        mergedCashInHand: toFixed2(
          totalIncome -
            latestResult.comprehensiveMerged.tax -
            pensionPersonalAccount -
            medicalInsurancePersonal -
            unemploymentInsurancePersonal -
            housingFundPersonalAccount -
            enterpriseAnnuityPersonalAccount -
            commercialHealthInsurance -
            personalPension
        ),
        separateCashInHand: toFixed2(
          totalIncome -
            latestResult.comprehensiveSeparate.totalTax -
            pensionPersonalAccount -
            medicalInsurancePersonal -
            unemploymentInsurancePersonal -
            housingFundPersonalAccount -
            enterpriseAnnuityPersonalAccount -
            commercialHealthInsurance -
            personalPension
        )
      })
    }
    if (category === 'business') {
      setShowBusinessResult(true)
      setBusinessResult(latestResult)
    }
    if (category === 'other') {
      setShowOtherResult(true)
      setOtherResult(latestResult)
    }
    if (supabase) {
      recordCalculateClick()
    }
  }

  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const email = authEmail.trim().toLowerCase()
    const password = authPassword

    if (!email) {
      setAuthError(authMode === 'forgot' ? '请输入邮箱。' : '请输入邮箱和密码。')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('请输入有效邮箱地址。')
      return
    }

    if (authMode !== 'forgot' && !password) {
      setAuthError('请输入邮箱和密码。')
      return
    }

    setAuthSubmitting(true)
    setAuthError('')
    setAuthMessage('')

    try {
      if (authMode === 'forgot') {
        const redirectTo = getPasswordRedirectUrl()
        const { error } = await sendPasswordResetEmail(email, redirectTo)
        if (error) {
          setAuthError(mapAuthErrorMessage(error.message))
          return
        }

        setAuthMessage('重置密码邮件已发送，请检查邮箱。')
        return
      }

      if (authMode === 'signin') {
        const { error } = await signInWithPassword(email, password)
        if (error) {
          setAuthError(mapAuthErrorMessage(error.message))
          return
        }
        setAuthMessage('登录成功。')
        setShowAuthPanel(false)
        return
      }

      const { data, error } = await signUpWithPassword(email, password)
      if (error) {
        setAuthError(mapAuthErrorMessage(error.message))
        return
      }

      if (data.session) {
        setAuthMessage('注册并登录成功。')
        setShowAuthPanel(false)
      } else {
        setAuthMessage('注册成功，请前往邮箱完成验证后登录。')
      }
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!nextPassword || !confirmNextPassword) {
      setAuthError('请输入新密码并确认。')
      return
    }

    if (nextPassword.length < 6) {
      setAuthError('新密码至少 6 位。')
      return
    }

    if (nextPassword !== confirmNextPassword) {
      setAuthError('两次输入的新密码不一致。')
      return
    }

    setAuthSubmitting(true)
    setAuthError('')
    setAuthMessage('')

    try {
      const { error } = await updateUserPassword(nextPassword)
      if (error) {
          setAuthError(mapAuthErrorMessage(error.message))
        return
      }

      setAuthMessage(passwordModalMode === 'recovery' ? '密码重置成功，请使用新密码登录。' : '密码修改成功。')
      setNextPassword('')
      setConfirmNextPassword('')
      setShowPasswordModal(false)
      if (passwordModalMode === 'recovery') {
        clearAuthUrlParams()
      }
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    const { error } = await signOutUser()
    if (error) {
      setAuthError(mapAuthErrorMessage(error.message))
      return
    }

    setView('home')
    setAuthMessage('已退出登录。')
    setShowAuthPanel(false)
  }

  const calculateClickTotal = useMemo(() => {
    if (!Array.isArray(stats)) return 0
    const clickItem = stats.find((item: any) => item.page_name === 'calculate_click')
    return clickItem?.count || 0
  }, [stats])

  const monthlySpecialDeduction = useMemo(() => {
    return toFixed2(parseNumber(taxInput.specialDeduction) / 12)
  }, [taxInput.specialDeduction])

  const contributionBase = useMemo(() => {
    return toFixed2((parseNumber(annualSalary) + parseNumber(taxInput.annualBonus)) / 12)
  }, [annualSalary, taxInput.annualBonus])

  const specialAdditionalDeductionSummary = useMemo(() => {
    const childEducation = parseNumber(specialAdditionalConfig.childEducationCount) * 2000 * 12
    const infantCare = parseNumber(specialAdditionalConfig.infantCareCount) * 2000 * 12
    const elderlySupport = specialAdditionalConfig.elderlySupport ? 3000 * 12 : 0
    const continuingEducation =
      (specialAdditionalConfig.continuingEducationDegree ? 400 * 12 : 0) +
      (specialAdditionalConfig.continuingEducationSkill ? 3600 : 0)
    const seriousIllnessMedical = Math.min(
      80000,
      Math.max(0, parseNumber(specialAdditionalConfig.seriousIllnessMedical) - 15000)
    )
    const housingLoanInterest = specialAdditionalConfig.housingLoanInterest ? 1000 * 12 : 0
    const housingRent =
      specialAdditionalConfig.housingRentTier === 'tier1'
        ? 1500 * 12
        : specialAdditionalConfig.housingRentTier === 'tier2'
          ? 1100 * 12
          : specialAdditionalConfig.housingRentTier === 'tier3'
            ? 800 * 12
            : 0

    return {
      childEducation,
      infantCare,
      elderlySupport,
      continuingEducation,
      seriousIllnessMedical,
      housingLoanInterest,
      housingRent,
      annualTotal: toFixed2(
        childEducation +
          infantCare +
          elderlySupport +
          continuingEducation +
          seriousIllnessMedical +
          housingLoanInterest +
          housingRent
      )
    }
  }, [specialAdditionalConfig])

  const otherDeductionSummary = useMemo(() => {
    const enterpriseAnnuity = parseNumber(otherDeductionConfig.enterpriseAnnuity)
    const commercialHealthInsurance = Math.min(2400, parseNumber(otherDeductionConfig.commercialHealthInsurance))
    const commercialPensionInsurance = Math.min(12000, parseNumber(otherDeductionConfig.commercialPensionInsurance))

    return {
      enterpriseAnnuity,
      commercialHealthInsurance,
      commercialPensionInsurance,
      annualTotal: toFixed2(enterpriseAnnuity + commercialHealthInsurance + commercialPensionInsurance)
    }
  }, [otherDeductionConfig])

  const fourFundSummary = useMemo(() => {
    const rows = fourFundColumns.map((col) => {
      const base = parseNumber(col.contributionBase)
      const years = parseNumber(col.contributionYears)
      const pensionRate = parseNumber(col.pensionRate)
      const medicalRate = parseNumber(col.medicalRate)
      const housingFundRate = parseNumber(col.housingFundRate)
      const personalPensionAmount = parseNumber(col.personalPensionAmount)

      const pensionTotal = toFixed2(base * (pensionRate / 100) * 12 * years)
      const medicalTotal = toFixed2(base * (medicalRate / 100) * 12 * years)
      const housingFundTotal = toFixed2(base * (housingFundRate / 100) * 12 * years * 2)
      const personalPensionTotal = toFixed2(personalPensionAmount * years)

      return {
        id: col.id,
        pensionTotal,
        medicalTotal,
        housingFundTotal,
        personalPensionTotal
      }
    })

    const totals = rows.reduce(
      (acc, row) => {
        acc.pensionTotal += row.pensionTotal
        acc.medicalTotal += row.medicalTotal
        acc.housingFundTotal += row.housingFundTotal
        acc.personalPensionTotal += row.personalPensionTotal
        return acc
      },
      {
        pensionTotal: 0,
        medicalTotal: 0,
        housingFundTotal: 0,
        personalPensionTotal: 0
      }
    )

    return {
      rows,
      totals: {
        pensionTotal: toFixed2(totals.pensionTotal),
        medicalTotal: toFixed2(totals.medicalTotal),
        housingFundTotal: toFixed2(totals.housingFundTotal),
        personalPensionTotal: toFixed2(totals.personalPensionTotal)
      }
    }
  }, [fourFundColumns])

  if (view === 'home') {
    return (
      <div className="app">
        <div className="card">
          <div className="header">
            <div>
              <p className="emoji">🏠</p>
              <div>
                <h1>财务工具箱</h1>
                <p className="subtitle">个税计算 / 四金累计 / 理财指南</p>
              </div>
            </div>
            {supabase ? (
              isAuthenticated ? (
                <div className="header-auth-wrap">
                  <button
                    type="button"
                    className="account-name-chip"
                    onClick={() => {
                      setAuthError('')
                      setAuthMessage('')
                      setPasswordModalMode('authenticated')
                      setShowPasswordModal(true)
                    }}
                    title="点击修改密码"
                  >
                    {currentAccountName || '已登录'}
                  </button>
                  <button className="index-btn" onClick={handleSignOut}>退出登录</button>
                </div>
              ) : (
                <button className="index-btn" onClick={() => setShowAuthPanel(true)}>
                  登录
                </button>
              )
            ) : null}
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
            <div className="feature-item" onClick={() => setView('fourFund')}>
              <div className="feature-icon">🧮</div>
              <h3>四金累计计算器</h3>
              <p>测算养老、医疗、公积金与个人养老金账户累计</p>
            </div>
          </div>

          {supabase ? null : (
            <p className="auth-hint">未配置 Supabase，登录扩展功能不可用（不影响正常使用）。</p>
          )}

          {supabase && showAuthPanel && !isAuthenticated ? (
            <div className="modal-overlay" onClick={() => setShowAuthPanel(false)}>
              <div className="modal-card login-modal-card" onClick={(e) => e.stopPropagation()}>
                <h3 className="modal-title">{authMode === 'signup' ? '邮箱注册' : authMode === 'forgot' ? '忘记密码' : '邮箱登录'}</h3>
                <p className="modal-subtitle">
                  {authMode === 'forgot' ? '输入你的注册邮箱，我们会发送重置密码邮件。' : '登录是扩展功能，不影响日常使用。'}
                </p>

                <form className="auth-form" onSubmit={handleAuthSubmit}>
                  <label className="label">
                    邮箱
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="例如: you@example.com"
                      autoComplete="email"
                    />
                  </label>

                  {authMode !== 'forgot' ? (
                    <label className="label">
                      密码
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="至少 6 位"
                        autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                      />
                    </label>
                  ) : null}

                  {authError ? <p className="auth-error">{authError}</p> : null}
                  {authMessage ? <p className="auth-success">{authMessage}</p> : null}

                  <button type="submit" className="calc-btn" disabled={authSubmitting || authLoading}>
                    {authSubmitting
                      ? '提交中...'
                      : authMode === 'forgot'
                        ? '发送重置邮件'
                        : authMode === 'signin'
                        ? '登录'
                        : '注册'}
                  </button>

                  {authMode === 'signin' ? (
                    <button
                      type="button"
                      className="text-link-btn"
                      onClick={() => {
                        setAuthMode('forgot')
                        setAuthError('')
                        setAuthMessage('')
                        setAuthPassword('')
                      }}
                    >
                      忘记密码？
                    </button>
                  ) : null}
                </form>

                <div className="modal-actions login-modal-actions">
                  <button
                    type="button"
                    className="index-btn auth-switch-btn"
                    onClick={() => {
                      setAuthMode((prev) => {
                        if (prev === 'signin') return 'signup'
                        return 'signin'
                      })
                      setAuthError('')
                      setAuthMessage('')
                    }}
                  >
                    {authMode === 'signup'
                      ? '已有账号？去登录'
                      : authMode === 'forgot'
                        ? '返回登录'
                        : '没有账号？去注册'}
                  </button>
                  <button type="button" className="index-btn" onClick={() => setShowAuthPanel(false)}>
                    关闭
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {supabase && showPasswordModal ? (
            <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
              <div className="modal-card login-modal-card" onClick={(e) => e.stopPropagation()}>
                <h3 className="modal-title">{passwordModalMode === 'recovery' ? '重置密码' : '修改密码'}</h3>
                <p className="modal-subtitle">
                  {passwordModalMode === 'recovery' ? '请输入新的登录密码。' : '修改当前账户密码。'}
                </p>

                <form className="auth-form" onSubmit={handleUpdatePassword}>
                  <label className="label">
                    新密码
                    <input
                      type="password"
                      value={nextPassword}
                      onChange={(e) => setNextPassword(e.target.value)}
                      placeholder="至少 6 位"
                      autoComplete="new-password"
                    />
                  </label>

                  <label className="label">
                    确认新密码
                    <input
                      type="password"
                      value={confirmNextPassword}
                      onChange={(e) => setConfirmNextPassword(e.target.value)}
                      placeholder="再次输入新密码"
                      autoComplete="new-password"
                    />
                  </label>

                  {authError ? <p className="auth-error">{authError}</p> : null}
                  {authMessage ? <p className="auth-success">{authMessage}</p> : null}

                  <button type="submit" className="calc-btn" disabled={authSubmitting || authLoading}>
                    {authSubmitting ? '提交中...' : passwordModalMode === 'recovery' ? '重置密码' : '保存新密码'}
                  </button>
                </form>

                <div className="modal-actions login-modal-actions">
                  <button type="button" className="index-btn" onClick={() => setShowPasswordModal(false)}>
                    关闭
                  </button>
                </div>
              </div>
            </div>
          ) : null}

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

  if (view === 'fourFund') {
    return (
      <div className="app">
        <div className="card">
          <header className="header">
            <div>
              <p className="emoji">🧮</p>
              <div>
                <h1>四金累计计算器</h1>
                <p className="subtitle">养老 / 医疗 / 公积金 / 个人养老金</p>
              </div>
            </div>
            <button className="index-btn" onClick={() => setView('home')}>
              返回首页
            </button>
          </header>

          <section className="form-panel">
            <div className="part-block part-block-advanced">
              <div className="tax-section">
                <h2>四金累计计算器</h2>
                <p className="pair-note">默认一栏；可增加多栏分别测算。住房公积金按个人与单位同比例计入账户累计。</p>

                <div className="four-fund-grid">
                  {fourFundColumns.map((col, index) => {
                    const rowSummary = fourFundSummary.rows.find((row) => row.id === col.id)
                    return (
                      <div key={col.id} className="four-fund-card">
                        <div className="four-fund-head">
                          <strong>第 {index + 1} 阶段</strong>
                          <button
                            type="button"
                            className="four-fund-remove-btn"
                            onClick={() => handleRemoveFourFundColumn(col.id)}
                            disabled={fourFundColumns.length <= 1}
                          >
                            删除
                          </button>
                        </div>
                        <div className="field-grid four-fund-fields">
                          <label className="label">
                            缴费基数（月）
                            <input
                              type="number"
                              min={0}
                              value={col.contributionBase}
                              onChange={handleFourFundInputChange(col.id, 'contributionBase')}
                            />
                          </label>
                          <label className="label">
                            缴费年限
                            <input
                              type="number"
                              min={0}
                              value={col.contributionYears}
                              onChange={handleFourFundInputChange(col.id, 'contributionYears')}
                            />
                          </label>
                          <label className="label">
                            养老账户比例（%）
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={col.pensionRate}
                              onChange={handleFourFundInputChange(col.id, 'pensionRate')}
                            />
                          </label>
                          <label className="label">
                            医疗账户比例（%）
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={col.medicalRate}
                              onChange={handleFourFundInputChange(col.id, 'medicalRate')}
                            />
                          </label>
                          <label className="label">
                            住房公积金比例（%）
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={col.housingFundRate}
                              onChange={handleFourFundInputChange(col.id, 'housingFundRate')}
                            />
                          </label>
                          <label className="label">
                            个人养老金年缴金额
                            <input
                              type="number"
                              min={0}
                              value={col.personalPensionAmount}
                              onChange={handleFourFundInputChange(col.id, 'personalPensionAmount')}
                            />
                          </label>
                        </div>

                        {rowSummary ? (
                          <div className="result four-fund-result">
                            <div className="item"><span>养老账户累计</span><strong>{rowSummary.pensionTotal.toLocaleString()} 元</strong></div>
                            <div className="item"><span>医疗账户累计</span><strong>{rowSummary.medicalTotal.toLocaleString()} 元</strong></div>
                            <div className="item"><span>住房公积金账户累计</span><strong>{rowSummary.housingFundTotal.toLocaleString()} 元</strong></div>
                            <div className="item"><span>个人养老金账户累计</span><strong>{rowSummary.personalPensionTotal.toLocaleString()} 元</strong></div>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>

                <button type="button" className="calc-btn" onClick={handleAddFourFundColumn}>
                  增加一栏
                </button>

                <div className="result four-fund-total-result">
                  <div className="item item-title"><strong>各账户总计（全部栏位）</strong></div>
                  <div className="item"><span>养老账户总计</span><strong>{fourFundSummary.totals.pensionTotal.toLocaleString()} 元</strong></div>
                  <div className="item"><span>医疗账户总计</span><strong>{fourFundSummary.totals.medicalTotal.toLocaleString()} 元</strong></div>
                  <div className="item"><span>住房公积金账户总计</span><strong>{fourFundSummary.totals.housingFundTotal.toLocaleString()} 元</strong></div>
                  <div className="item"><span>个人养老金账户总计</span><strong>{fourFundSummary.totals.personalPensionTotal.toLocaleString()} 元</strong></div>
                </div>
              </div>
            </div>
          </section>
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
              <div className="field-grid field-grid-comprehensive">
                <div className="salary-bonus-group pair-group pair-group-full">
                  <p className="pair-title">工资、薪金所得（全年，不含年终奖）</p>
                  <div className="salary-bonus-grid">
                    <label className="label">
                      月薪
                      <input type="number" value={monthlySalary} min={0} onChange={handleMonthlySalaryChange} />
                    </label>
                    <div className="salary-bonus-divider" aria-hidden="true" />
                    <label className="label">
                      年薪
                      <input type="number" value={annualSalary} min={0} onChange={handleAnnualSalaryChange} />
                    </label>
                  </div>
                  <p className="pair-note">输入月薪自动计算年薪。</p>
                </div>
                <label className="label input-card">
                  年终奖（全年）
                  <input type="number" value={taxInput.annualBonus} min={0} onChange={handleInputChange('annualBonus')} />
                </label>
                <label className="label input-card">
                  劳务报酬所得
                  <input type="number" value={taxInput.a2} min={0} onChange={handleInputChange('a2')} />
                </label>
                <label className="label input-card">
                  特许权使用费所得
                  <input type="number" value={taxInput.a3} min={0} onChange={handleInputChange('a3')} />
                </label>
                <label className="label input-card">
                  稿酬所得
                  <input type="number" value={taxInput.a4} min={0} onChange={handleInputChange('a4')} />
                </label>
                <div className="pair-group pair-group-full special-deduction-group">
                  <button
                    type="button"
                    className="special-deduction-config-btn"
                    onClick={() => setShowSpecialDeductionConfig(true)}
                  >
                    专项扣除（五险一金，点击可设置比例）
                  </button>
                  <label className="label">
                    缴费基数（简易计算：(年薪 + 年终奖) / 12）
                    <input type="number" value={contributionBase} min={0} readOnly />
                  </label>
                  <div className="salary-bonus-grid">
                    <label className="label">
                      月缴纳
                      <input type="number" value={monthlySpecialDeduction} min={0} readOnly />
                    </label>
                    <div className="salary-bonus-divider" aria-hidden="true" />
                    <label className="label">
                      年缴纳
                      <input type="number" value={taxInput.specialDeduction} min={0} readOnly />
                    </label>
                  </div>
                </div>
                <div className="pair-group special-deduction-group">
                  <button
                    type="button"
                    className="special-deduction-config-btn"
                    onClick={() => setShowSpecialAdditionalDeductionConfig(true)}
                  >
                    专项附加扣除（点击设置七项内容）
                  </button>
                  <label className="label deduction-summary-label">
                    <input type="number" value={taxInput.specialAdditionalDeduction} min={0} readOnly />
                  </label>
                </div>
                <div className="pair-group special-deduction-group">
                  <button
                    type="button"
                    className="special-deduction-config-btn"
                    onClick={() => setShowOtherDeductionConfig(true)}
                  >
                    其他扣除（点击设置三项内容）
                  </button>
                  <label className="label deduction-summary-label">
                    <input type="number" value={taxInput.otherDeduction} min={0} readOnly />
                  </label>
                </div>
              </div>
              <button className="calc-btn" onClick={() => handleCalculateClick('comprehensive')}>
                点击计算综合所得
              </button>
            </div>

            {showComprehensiveResult && comprehensiveResult && comprehensiveCashBreakdown ? (
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
                <div className="result-summary-block">
                  <div className="item item-title">
                    <strong>到手测算</strong>
                  </div>
                  <div className="item">
                    <span>总收入</span>
                    <strong>{comprehensiveCashBreakdown.totalIncome.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>应纳税额</span>
                    <strong>{comprehensiveResult.comprehensiveMerged.tax.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>养老保险（个人账户）</span>
                    <strong>{comprehensiveCashBreakdown.pensionPersonalAccount.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>医疗保险</span>
                    <strong>{comprehensiveCashBreakdown.medicalInsurancePersonal.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>失业保险</span>
                    <strong>{comprehensiveCashBreakdown.unemploymentInsurancePersonal.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>住房公积金（个人账户）</span>
                    <strong>{comprehensiveCashBreakdown.housingFundPersonalAccount.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>企业年金（个人账户）</span>
                    <strong>{comprehensiveCashBreakdown.enterpriseAnnuityPersonalAccount.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>个人养老金（个人账户）</span>
                    <strong>{comprehensiveCashBreakdown.personalPension.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>商业健康保险</span>
                    <strong>{comprehensiveCashBreakdown.commercialHealthInsurance.toLocaleString()} 元</strong>
                  </div>
                  
                  <div className="item result-summary-final">
                    <span>到手现金</span>
                    <strong>{comprehensiveCashBreakdown.mergedCashInHand.toLocaleString()} 元</strong>
                  </div>
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
                <div className="result-summary-block">
                  <div className="item item-title">
                    <strong>到手测算</strong>
                  </div>
                  <div className="item">
                    <span>总收入</span>
                    <strong>{comprehensiveCashBreakdown.totalIncome.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>应纳税额</span>
                    <strong>{comprehensiveResult.comprehensiveSeparate.totalTax.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>养老保险（个人账户）</span>
                    <strong>{comprehensiveCashBreakdown.pensionPersonalAccount.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>医疗保险（个人账户）</span>
                    <strong>{comprehensiveCashBreakdown.medicalInsurancePersonal.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>失业保险</span>
                    <strong>{comprehensiveCashBreakdown.unemploymentInsurancePersonal.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>住房公积金（个人账户）</span>
                    <strong>{comprehensiveCashBreakdown.housingFundPersonalAccount.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>企业年金（个人账户）</span>
                    <strong>{comprehensiveCashBreakdown.enterpriseAnnuityPersonalAccount.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>商业健康保险</span>
                    <strong>{comprehensiveCashBreakdown.commercialHealthInsurance.toLocaleString()} 元</strong>
                  </div>
                  <div className="item">
                    <span>个人养老金</span>
                    <strong>{comprehensiveCashBreakdown.personalPension.toLocaleString()} 元</strong>
                  </div>
                  <div className="item result-summary-final">
                    <span>到手现金</span>
                    <strong>{comprehensiveCashBreakdown.separateCashInHand.toLocaleString()} 元</strong>
                  </div>
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

        {showSpecialDeductionConfig ? (
          <div className="modal-overlay" onClick={() => setShowSpecialDeductionConfig(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">专项扣除参数设置</h3>
              <p className="modal-subtitle">默认比例：养老 8%，医疗 2%，失业 0.5%，工伤 0%，住房公积金 5%（范围 5%~12%）</p>
              <div className="field-grid modal-grid">
                <label className="label">
                  养老保险（%）
                  <input type="number" min={0} step={0.1} value={insuranceRates.pension} onChange={handleInsuranceRateChange('pension')} />
                </label>
                <label className="label">
                  医疗保险（%）
                  <input type="number" min={0} step={0.1} value={insuranceRates.medical} onChange={handleInsuranceRateChange('medical')} />
                </label>
                <label className="label">
                  失业保险（%）
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={insuranceRates.unemployment}
                    onChange={handleInsuranceRateChange('unemployment')}
                  />
                </label>
                <label className="label">
                  工伤保险（%）
                  <input type="number" min={0} step={0.1} value={insuranceRates.injury} onChange={handleInsuranceRateChange('injury')} />
                </label>
                <label className="label">
                  住房公积金（%）
                  <input
                    type="number"
                    min={5}
                    max={12}
                    step={0.1}
                    value={insuranceRates.housingFund}
                    onChange={handleInsuranceRateChange('housingFund')}
                  />
                </label>
              </div>
              <p className="modal-preview">
                当前自动计算专项扣除：{Number(taxInput.specialDeduction).toLocaleString()} 元/年
              </p>
              <div className="modal-actions">
                <button type="button" className="index-btn" onClick={() => setShowSpecialDeductionConfig(false)}>
                  完成
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showSpecialAdditionalDeductionConfig ? (
          <div className="modal-overlay" onClick={() => setShowSpecialAdditionalDeductionConfig(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">专项附加扣除设置</h3>
              <p className="modal-subtitle">设置七项内容后，系统会自动计算 1 年总免除额并回填到主表单。</p>

              <div className="additional-deduction-list">
                <div className="additional-deduction-item">
                  <div className="additional-deduction-head">
                    <strong>1. 子女教育</strong>
                    <span className="additional-deduction-value">{specialAdditionalDeductionSummary.childEducation.toLocaleString()} 元/年</span>
                  </div>
                  <div className="salary-bonus-grid additional-deduction-grid">
                    <label className="label">
                      子女数目
                      <input
                        type="number"
                        min={0}
                        value={specialAdditionalConfig.childEducationCount}
                        onChange={handleAdditionalDeductionCountChange('childEducationCount')}
                      />
                    </label>
                    <div className="salary-bonus-divider" aria-hidden="true" />
                    <label className="label">
                      扣除数目（每个子女每月 2000）
                      <input type="number" value={specialAdditionalDeductionSummary.childEducation} readOnly />
                    </label>
                  </div>
                </div>

                <div className="additional-deduction-item">
                  <div className="additional-deduction-head">
                    <strong>2. 3岁以下婴幼儿照护</strong>
                    <span className="additional-deduction-value">{specialAdditionalDeductionSummary.infantCare.toLocaleString()} 元/年</span>
                  </div>
                  <div className="salary-bonus-grid additional-deduction-grid">
                    <label className="label">
                      婴幼儿数目
                      <input
                        type="number"
                        min={0}
                        value={specialAdditionalConfig.infantCareCount}
                        onChange={handleAdditionalDeductionCountChange('infantCareCount')}
                      />
                    </label>
                    <div className="salary-bonus-divider" aria-hidden="true" />
                    <label className="label">
                      扣除数目（每个婴幼儿每月 2000）
                      <input type="number" value={specialAdditionalDeductionSummary.infantCare} readOnly />
                    </label>
                  </div>
                </div>

                <div className="additional-deduction-item">
                  <div className="additional-deduction-head">
                    <strong>3. 赡养老人</strong>
                    <span className="additional-deduction-value">{specialAdditionalDeductionSummary.elderlySupport.toLocaleString()} 元/年</span>
                  </div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={specialAdditionalConfig.elderlySupport}
                      onChange={handleAdditionalDeductionCheckboxChange('elderlySupport')}
                    />
                    <span>年满60岁，本人独生子女，每月 3000</span>
                  </label>
                </div>

                <div className="additional-deduction-item">
                  <div className="additional-deduction-head">
                    <strong>4. 继续教育</strong>
                    <span className="additional-deduction-value">{specialAdditionalDeductionSummary.continuingEducation.toLocaleString()} 元/年</span>
                  </div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={specialAdditionalConfig.continuingEducationDegree}
                      onChange={handleAdditionalDeductionCheckboxChange('continuingEducationDegree')}
                    />
                    <span>学历（学位）教育，每月 400</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={specialAdditionalConfig.continuingEducationSkill}
                      onChange={handleAdditionalDeductionCheckboxChange('continuingEducationSkill')}
                    />
                    <span>技能人员职业资格，取得证书，3600 元/年</span>
                  </label>
                </div>

                <div className="additional-deduction-item">
                  <div className="additional-deduction-head">
                    <strong>5. 大病医疗</strong>
                    <span className="additional-deduction-value">{specialAdditionalDeductionSummary.seriousIllnessMedical.toLocaleString()} 元/年</span>
                  </div>
                  <label className="label">
                    医保报销后个人负担金额
                    <input
                      type="number"
                      min={0}
                      value={specialAdditionalConfig.seriousIllnessMedical}
                      onChange={handleAdditionalDeductionCountChange('seriousIllnessMedical')}
                    />
                  </label>
                  <p className="pair-note">按超过 15000 元的部分计算，最高 80000 元。</p>
                </div>

                <div className="additional-deduction-item">
                  <div className="additional-deduction-head">
                    <strong>6. 住房贷款利息</strong>
                    <span className="additional-deduction-value">{specialAdditionalDeductionSummary.housingLoanInterest.toLocaleString()} 元/年</span>
                  </div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={specialAdditionalConfig.housingLoanInterest}
                      onChange={handleAdditionalDeductionCheckboxChange('housingLoanInterest')}
                    />
                    <span>每月 1000</span>
                  </label>
                </div>

                <div className="additional-deduction-item">
                  <div className="additional-deduction-head">
                    <strong>7. 住房租金</strong>
                    <span className="additional-deduction-value">{specialAdditionalDeductionSummary.housingRent.toLocaleString()} 元/年</span>
                  </div>
                  <div className="radio-group">
                    <label className="checkbox-row">
                      <input
                        type="radio"
                        name="housing-rent-tier"
                        value="tier1"
                        checked={specialAdditionalConfig.housingRentTier === 'tier1'}
                        onChange={handleHousingRentTierChange}
                      />
                      <span>（一）直辖市、省会（首府）城市、计划单列市及国务院确定的其他城市，每月 1500</span>
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="radio"
                        name="housing-rent-tier"
                        value="tier2"
                        checked={specialAdditionalConfig.housingRentTier === 'tier2'}
                        onChange={handleHousingRentTierChange}
                      />
                      <span>（二）市辖区户籍人口超过 100 万的城市，每月 1100</span>
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="radio"
                        name="housing-rent-tier"
                        value="tier3"
                        checked={specialAdditionalConfig.housingRentTier === 'tier3'}
                        onChange={handleHousingRentTierChange}
                      />
                      <span>（三）市辖区户籍人口不超过 100 万的城市，每月 800</span>
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="radio"
                        name="housing-rent-tier"
                        value="none"
                        checked={specialAdditionalConfig.housingRentTier === 'none'}
                        onChange={handleHousingRentTierChange}
                      />
                      <span>不选择住房租金扣除</span>
                    </label>
                  </div>
                </div>
              </div>

              <p className="modal-preview">
                当前专项附加扣除总额：{specialAdditionalDeductionSummary.annualTotal.toLocaleString()} 元/年
              </p>
              <div className="modal-actions">
                <button type="button" className="index-btn" onClick={() => setShowSpecialAdditionalDeductionConfig(false)}>
                  完成
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showOtherDeductionConfig ? (
          <div className="modal-overlay" onClick={() => setShowOtherDeductionConfig(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">其他扣除设置</h3>
              <p className="modal-subtitle">包含企业年金/职业年金、商业健康保险、商业养老保险三项，系统会自动计算年度总扣除额。</p>

              <div className="additional-deduction-list">
                <div className="additional-deduction-item">
                  <div className="additional-deduction-head">
                    <strong>1. 企业年金 / 职业年金</strong>
                    <span className="additional-deduction-value">{otherDeductionSummary.enterpriseAnnuity.toLocaleString()} 元/年</span>
                  </div>
                  <label className="label">
                    年度缴费金额
                    <input
                      type="number"
                      min={0}
                      value={otherDeductionConfig.enterpriseAnnuity}
                      onChange={handleOtherDeductionChange('enterpriseAnnuity')}
                    />
                  </label>
                </div>

                <div className="additional-deduction-item">
                  <div className="additional-deduction-head">
                    <strong>2. 商业健康保险</strong>
                    <span className="additional-deduction-value">{otherDeductionSummary.commercialHealthInsurance.toLocaleString()} 元/年</span>
                  </div>
                  <label className="label">
                    年度保费金额
                    <input
                      type="number"
                      min={0}
                      value={otherDeductionConfig.commercialHealthInsurance}
                      onChange={handleOtherDeductionChange('commercialHealthInsurance')}
                    />
                  </label>
                  <p className="pair-note">按 2400 元/年（200 元/月）的限额扣除。</p>
                </div>

                <div className="additional-deduction-item">
                  <div className="additional-deduction-head">
                    <strong>3. 商业养老保险</strong>
                    <span className="additional-deduction-value">{otherDeductionSummary.commercialPensionInsurance.toLocaleString()} 元/年</span>
                  </div>
                  <label className="label">
                    年度保费金额
                    <input
                      type="number"
                      min={0}
                      value={otherDeductionConfig.commercialPensionInsurance}
                      onChange={handleOtherDeductionChange('commercialPensionInsurance')}
                    />
                  </label>
                  <p className="pair-note">按 12000 元/年的限额扣除。</p>
                </div>
              </div>

              <p className="modal-preview">
                当前其他扣除总额：{otherDeductionSummary.annualTotal.toLocaleString()} 元/年
              </p>
              <div className="modal-actions">
                <button type="button" className="index-btn" onClick={() => setShowOtherDeductionConfig(false)}>
                  完成
                </button>
              </div>
            </div>
          </div>
        ) : null}

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
