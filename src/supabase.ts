import { createClient } from '@supabase/supabase-js'

// 从环境变量读取，或使用默认值
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 记录浏览量
export async function recordPageView(pageName: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
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

// 获取浏览量统计
export async function getPageViewStats(pageName?: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
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
