import { createClient } from '@supabase/supabase-js'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

type AppEnv = {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

declare global {
  interface Window {
    __APP_ENV__?: AppEnv
  }
}

function getRuntimeEnv(): AppEnv {
  if (typeof window === 'undefined') return {}
  return window.__APP_ENV__ ?? {}
}

function pickEnvValue(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

// 优先读取运行时配置，缺失时回退到 Vite 环境变量，兼容本地开发与静态部署。
const runtimeEnv = getRuntimeEnv()
const supabaseUrl = pickEnvValue(runtimeEnv.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = pickEnvValue(runtimeEnv.VITE_SUPABASE_ANON_KEY, import.meta.env.VITE_SUPABASE_ANON_KEY)

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function getCurrentSession() {
  if (!supabase) {
    return { data: { session: null }, error: new Error('Supabase not configured') }
  }

  return supabase.auth.getSession()
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  if (!supabase) {
    return {
      data: {
        subscription: {
          unsubscribe: () => undefined
        }
      }
    }
  }

  return supabase.auth.onAuthStateChange(callback)
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) {
    return { data: { user: null, session: null }, error: new Error('Supabase not configured') }
  }

  return supabase.auth.signInWithPassword({
    email,
    password
  })
}

export async function signUpWithPassword(email: string, password: string) {
  if (!supabase) {
    return { data: { user: null, session: null }, error: new Error('Supabase not configured') }
  }

  return supabase.auth.signUp({
    email,
    password
  })
}

export async function signOutUser() {
  if (!supabase) {
    return { error: new Error('Supabase not configured') }
  }

  return supabase.auth.signOut()
}

export async function sendPasswordResetEmail(email: string, redirectTo?: string) {
  if (!supabase) {
    return { data: {}, error: new Error('Supabase not configured') }
  }

  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  })
}

export async function updateUserPassword(password: string) {
  if (!supabase) {
    return { data: { user: null }, error: new Error('Supabase not configured') }
  }

  return supabase.auth.updateUser({
    password
  })
}

// 记录浏览量
export async function recordPageView(pageName: string) {
  if (!supabase) {
    console.warn('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
    return
  }

  try {
    const { data, error } = await supabase
      .from('page_views')
      .insert({
        page_name: pageName,
        visited_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
      })

    if (error) {
      console.error('Failed to record page view:', error)
    } else {
      console.log('Page view recorded:', data)
    }
  } catch (err) {
    console.error('Error recording page view:', err)
  }
}

// 记录计算按钮点击次数
export async function recordCalculateClick() {
  await recordPageView('calculate_click')
}

// 获取浏览量统计
export async function getPageViewStats(pageName?: string) {
  if (!supabase) {
    console.warn('Supabase not configured')
    return null
  }

  try {
    let query = supabase
      .from('page_views')
      .select('page_name')

    if (pageName) {
      query = query.eq('page_name', pageName)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch page view stats:', error)
      return null
    }

    // 统计每个页面的访问次数
    if (!data) return []
    
    const stats: { [key: string]: number } = {}
    data.forEach((item: any) => {
      const page = item.page_name || 'unknown'
      stats[page] = (stats[page] || 0) + 1
    })

    // 转换为数组格式
    return Object.entries(stats).map(([page_name, count]) => ({
      page_name,
      count
    }))
  } catch (err) {
    console.error('Error fetching page view stats:', err)
    return null
  }
}
