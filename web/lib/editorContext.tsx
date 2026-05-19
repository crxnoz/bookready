'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { TenantData } from './types'
import { mockTenant } from './mockTenant'

interface EditorContextType {
  data: TenantData
  updateBusiness: (updates: Partial<TenantData['business']>) => void
  updateServices: (services: TenantData['services']) => void
  updateStaff: (staff: TenantData['staff']) => void
  updateGallery: (gallery: TenantData['gallery']) => void
  updateHours: (hours: TenantData['hours']) => void
  updatePolicies: (policies: TenantData['policies']) => void
  updateFaqs: (faqs: TenantData['faqs']) => void
  isSaving: boolean
  setIsSaving: (v: boolean) => void
}

const EditorContext = createContext<EditorContextType | null>(null)

export function EditorProvider({
  children,
  initialData = mockTenant,
}: {
  children: ReactNode
  initialData?: TenantData
}) {
  const [data, setData] = useState<TenantData>(initialData)
  const [isSaving, setIsSaving] = useState(false)

  const updateBusiness = (updates: Partial<TenantData['business']>) =>
    setData(prev => ({ ...prev, business: { ...prev.business, ...updates } }))

  const updateServices = (services: TenantData['services']) =>
    setData(prev => ({ ...prev, services }))

  const updateStaff = (staff: TenantData['staff']) =>
    setData(prev => ({ ...prev, staff }))

  const updateGallery = (gallery: TenantData['gallery']) =>
    setData(prev => ({ ...prev, gallery }))

  const updateHours = (hours: TenantData['hours']) =>
    setData(prev => ({ ...prev, hours }))

  const updatePolicies = (policies: TenantData['policies']) =>
    setData(prev => ({ ...prev, policies }))

  const updateFaqs = (faqs: TenantData['faqs']) =>
    setData(prev => ({ ...prev, faqs }))

  return (
    <EditorContext.Provider
      value={{
        data,
        updateBusiness,
        updateServices,
        updateStaff,
        updateGallery,
        updateHours,
        updatePolicies,
        updateFaqs,
        isSaving,
        setIsSaving,
      }}
    >
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor(): EditorContextType {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used inside EditorProvider')
  return ctx
}
