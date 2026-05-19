import { useState, useEffect, useCallback } from 'react'
import { Search, Users, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import StatusBadge from '../components/shared/StatusBadge.jsx'
import { contactsAPI } from '../lib/api.js'

const PAGE_SIZE = 50

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(0)
  }, [debouncedSearch])

  const load = useCallback(() => {
    setIsLoading(true)
    const params = {
      limit: PAGE_SIZE,
      page: page + 1,
      ...(debouncedSearch ? { search: debouncedSearch } : {})
    }
    contactsAPI.list(params)
      .then(res => {
        setContacts(res.data.contacts || [])
        setTotal(res.data.pagination?.total || 0)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [page, debouncedSearch])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
          <p className="text-gray-500 text-sm mt-1">{total.toLocaleString('es-MX')} contactos registrados</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Buscar por nombre, apellido o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-colibri animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-14">
            <Users size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {search ? 'No se encontraron contactos' : 'Aún no hay contactos'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Sube un archivo Excel o CSV desde la sección de campañas
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    {['Nombre', 'Teléfono', 'Grupo', 'Estado', 'Alta'].map(h => (
                      <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {[c.nombre, c.apellido].filter(Boolean).join(' ')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 font-mono">{c.telefono}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{c.grupo || '—'}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={c.status} size="xs" />
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-colibri hover:text-colibri disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-gray-600 px-2 py-1">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-colibri hover:text-colibri disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
