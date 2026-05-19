import { useState, useEffect } from 'react'
import useAuthStore from '../store/authStore.js'

export function useAuth() {
  const {
    user,
    session,
    tenant,
    tenantRole,
    isAdmin,
    isLoading,
    error,
    login,
    logout,
    clearError
  } = useAuthStore()

  const isAuthenticated = !!session && !!user

  return {
    user,
    session,
    tenant,
    tenantRole,
    isAdmin,
    isLoading,
    error,
    isAuthenticated,
    login,
    logout,
    clearError
  }
}

export default useAuth
