import ReactMarkdown from 'react-markdown'
import { useState, useEffect } from 'react'
import remarkGfm from 'remark-gfm'

const GUIDE_SECTIONS = [
  {
    name: '理财知识',
    articles: [
      {
        title: '个人理财实操指南',
        subtitle: '计划制定、基金选择、回撤管理',
        path: '/guide/「个人理财实操指南」：手把手教你制定计划、挑选基金，附真实案例分析/SoC8tV/「个人理财实操指南」：手把手教你制定计划、挑选基金，附真实案例分析.md'
      }
    ]
  },
  {
    name: '考证',
    articles: [
      {
        title: '业余无线电台考证全攻略',
        subtitle: '一个月拿证流程与备考建议',
        path: '/guide/20250727如何一个月拿到业余无线电台操作证书-执照？--考证全攻略/HPMp9G/（归档） 20250727如何一个月拿到业余无线电台操作证书-执照？--考证全攻略_gc6HZEuhGGPDDG3WBjBx2z.md'
      }
    ]
  }
]

const HIDDEN_ARTICLE_PATH_KEYWORDS = ['20250727']

const VISIBLE_GUIDE_SECTIONS = GUIDE_SECTIONS
  .map((section) => ({
    ...section,
    articles: section.articles.filter(
      (article) => !HIDDEN_ARTICLE_PATH_KEYWORDS.some((keyword) => article.path.includes(keyword))
    )
  }))
  .filter((section) => section.articles.length > 0)

const ALL_ARTICLES = VISIBLE_GUIDE_SECTIONS.flatMap((section) => section.articles)

type ViewMode = 'catalog' | 'article'

function resolveImageSrc(src: string, basePath: string) {
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) {
    return src
  }

  const cleaned = src.replace(/^\.\//, '')
  return `${basePath}/${cleaned}`
}

function CustomImage({ src, alt, basePath }: { src?: string; alt?: string; basePath: string }) {
  if (!src) return null

  const imgSrc = resolveImageSrc(src, basePath)
  return <img src={imgSrc} alt={alt} className="guide-img" style={{ maxWidth: '100%', height: 'auto', margin: '1em 0' }} />
}

export function FinanceGuide() {
  const [viewMode, setViewMode] = useState<ViewMode>('catalog')
  const [selectedPath, setSelectedPath] = useState(ALL_ARTICLES[0]?.path ?? '')
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (viewMode !== 'article') return

    setLoading(true)
    fetch(selectedPath)
      .then(res => res.text())
      .then(text => {
        setMarkdown(text)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load markdown:', err)
        setLoading(false)
      })
  }, [selectedPath, viewMode])

  const basePath = selectedPath.substring(0, selectedPath.lastIndexOf('/'))
  const currentArticle = ALL_ARTICLES.find((item) => item.path === selectedPath)

  function openArticle(path: string) {
    setSelectedPath(path)
    setViewMode('article')
    setSidebarVisible(false)
  }

  if (viewMode === 'catalog') {
    return (
      <div className="guide-view">
        <div className="guide-catalog-head">
          <h2 className="guide-catalog-title">专栏</h2>
          <p className="guide-catalog-subtitle">先选择专栏和文章标题，再进入阅读</p>
        </div>

        <div className="guide-catalog-grid">
          {VISIBLE_GUIDE_SECTIONS.map((section) => (
            <div className="guide-section-card" key={section.name}>
              <h3 className="guide-section-title">{section.name}</h3>
              <div className="guide-article-list">
                {section.articles.map((article) => (
                  <button
                    key={article.path}
                    type="button"
                    className="guide-article-btn"
                    onClick={() => openArticle(article.path)}
                  >
                    <span className="guide-article-name">{article.title}</span>
                    <span className="guide-article-subtitle">{article.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="guide-view">
      <div className="guide-reader-head">
        <button type="button" className="index-btn" onClick={() => setViewMode('catalog')}>返回专栏</button>
        <button type="button" className="guide-toggle-btn" onClick={() => setSidebarVisible((v) => !v)}>
          {sidebarVisible ? '收起目录' : '展开目录'}
        </button>
      </div>

      <div className="guide-layout">
        {sidebarVisible && <button type="button" className="guide-sidebar-mask" onClick={() => setSidebarVisible(false)} aria-label="关闭目录" />}

        <aside className={`guide-floating-sidebar ${sidebarVisible ? 'open' : ''}`}>
          {VISIBLE_GUIDE_SECTIONS.map((section) => (
            <div className="guide-section-card" key={section.name}>
              <h3 className="guide-section-title guide-section-title-spaced">{section.name}</h3>
              <div className="guide-article-list">
                {section.articles.map((article) => (
                  <button
                    key={article.path}
                    type="button"
                    className={`guide-article-btn ${selectedPath === article.path ? 'active' : ''}`}
                    onClick={() => setSelectedPath(article.path)}
                  >
                    <span className="guide-article-name">{article.title}</span>
                    <span className="guide-article-subtitle">{article.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <section className="guide-content-panel">
          <div className="guide-content-head">
            <h2 className="guide-content-title">{currentArticle?.title ?? '文档'}</h2>
            <p className="guide-content-subtitle">{currentArticle?.subtitle ?? '阅读内容加载中'}</p>
          </div>

          {loading ? (
            <div className="guide-loading">文档加载中...</div>
          ) : (
            <div className="guide-markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
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
                  img: (props) => <CustomImage src={props.src} alt={props.alt} basePath={basePath} />,
                  hr: () => <hr className="guide-hr" />,
                  strong: ({ children }) => <strong>{children}</strong>,
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
