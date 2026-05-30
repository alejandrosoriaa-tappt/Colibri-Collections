import useAuthStore from '../store/authStore.js'
import { getOrgConfig } from '../config/orgTypeConfig.js'

/**
 * Returns the org type configuration for the current tenant.
 * Components use this to get labels, feature flags, and field visibility
 * without hardcoding org_type checks everywhere.
 *
 * @example
 * const orgConfig = useOrgConfig()
 * <th>{orgConfig.contactLabel}</th>        // "Familia" | "Socio" | "Residente"
 * {orgConfig.hasStudent && <StudentField />}
 */
export function useOrgConfig() {
  const { tenant } = useAuthStore()
  return getOrgConfig(tenant?.org_type)
}

export default useOrgConfig
