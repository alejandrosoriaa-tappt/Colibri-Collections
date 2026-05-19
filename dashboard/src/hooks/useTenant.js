import { useState, useEffect } from 'react'
import useAuthStore from '../store/authStore.js'
import { campaignsAPI } from '../lib/api.js'

export function useTenant() {
  const { tenant, isLoading: authLoading } = useAuthStore()
  const [campaigns, setCampaigns] = useState([])
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (tenant) {
      loadCampaigns()
    }
  }, [tenant])

  async function loadCampaigns() {
    setCampaignsLoading(true)
    try {
      const response = await campaignsAPI.list()
      setCampaigns(response.data.campaigns || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setCampaignsLoading(false)
    }
  }

  return {
    tenant,
    campaigns,
    isLoading: authLoading || campaignsLoading,
    error,
    refetchCampaigns: loadCampaigns
  }
}

export default useTenant
