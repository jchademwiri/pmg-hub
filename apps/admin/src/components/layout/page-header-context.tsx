'use client'

import * as React from 'react'

interface PageHeaderContextValue {
  total: string | null
  setTotal: (v: string | null) => void
}

const PageHeaderContext = React.createContext<PageHeaderContextValue>({
  total: null,
  setTotal: () => {},
})

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [total, setTotal] = React.useState<string | null>(null)
  return (
    <PageHeaderContext.Provider value={{ total, setTotal }}>
      {children}
    </PageHeaderContext.Provider>
  )
}

export function usePageHeader() {
  return React.useContext(PageHeaderContext)
}

/** Drop this anywhere inside a page to push a total string into the top nav */
export function SetPageTotal({ value }: { value: string }) {
  const { setTotal } = usePageHeader()
  React.useEffect(() => {
    setTotal(value)
    return () => setTotal(null)
  }, [value, setTotal])
  return null
}
