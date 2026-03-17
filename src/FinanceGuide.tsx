import ReactMarkdown from 'react-markdown'
import { useState, useEffect } from 'react'

// 自定义 img 组件来处理图片路径
function CustomImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src) return null
  
  // 如果是相对路径 image/image_*.png，转换为完整路径
  if (src.includes('image/image_')) {
    const fullPath = `/guide/「个人理财实操指南」：手把手教你制定计划、挑选基金，附真实案例分析/SoC8tV/${src}`
    return <img src={fullPath} alt={alt} className="guide-img" style={{maxWidth: '100%', height: 'auto', margin: '1em 0'}} />
  }
  
  return <img src={src} alt={alt} className="guide-img" style={{maxWidth: '100%', height: 'auto', margin: '1em 0'}} />
}

export function FinanceGuide() {
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 从 public 文件夹加载 md 文件
    fetch('/guide/「个人理财实操指南」：手把手教你制定计划、挑选基金，附真实案例分析/SoC8tV/「个人理财实操指南」：手把手教你制定计划、挑选基金，附真实案例分析.md')
      .then(res => res.text())
      .then(text => {
        setMarkdown(text)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load markdown:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="guide-view"><p>加载中...</p></div>
  }

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
            img: (props) => <CustomImage src={props.src} alt={props.alt} />,
            hr: () => <hr className="guide-hr" />,
            strong: ({ children }) => <strong>{children}</strong>,
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  )
}
