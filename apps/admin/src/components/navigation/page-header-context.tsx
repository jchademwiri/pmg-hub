'use client'

import * as React from 'react'

export type TotalVariant = 'green' | 'amber' | 'red' | 'default'

interface PageHeaderContextValue {
  total: string | null
  totalVariant: TotalVariant
  setTotal: (v: string | null, variant?: TotalVariant) => void
  customLabel: string | null
  setCustomLabel: (v: string | null) => void
}

const PageHeaderContext = React.createContext<PageHeaderContextValue>({
  total: null,
  totalVariant: 'default',
  setTotal: () => {},
  customLabel: null,
  setCustomLabel: () => {},
})

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [total, setTotalValue] = React.useState<string | null>(null)
  const [totalVariant, setTotalVariant] = React.useState<TotalVariant>('default')
  const [customLabel, setCustomLabelValue] = React.useState<string | null>(null)

  const setTotal = React.useCallback((v: string | null, variant: TotalVariant = 'default') => {
    setTotalValue(v)
    setTotalVariant(variant)
  }, [])

  const setCustomLabel = React.useCallback((v: string | null) => {
    setCustomLabelValue(v)
  }, [])

  return (
    <PageHeaderContext.Provider value={{ total, totalVariant, setTotal, customLabel, setCustomLabel }}>
      {children}
    </PageHeaderContext.Provider>
  )
}

export function usePageHeader() {
  return React.useContext(PageHeaderContext)
}

/** Drop this anywhere inside a page to push a total string into the top nav */
export function SetPageTotal({ value, variant = 'default' }: { value: string; variant?: TotalVariant }) {
  const { setTotal } = usePageHeader()
  React.useEffect(() => {
    setTotal(value, variant)
    return () => setTotal(null)
  }, [value, variant, setTotal])
  return null
}

/** Drop this anywhere inside a page to override the breadcrumb label in the top nav */
export function SetPageLabel({ value }: { value: string }) {
  const { setCustomLabel } = usePageHeader()
  React.useEffect(() => {
    setCustomLabel(value)
    return () => setCustomLabel(null)
  }, [value, setCustomLabel])
  return null
}
