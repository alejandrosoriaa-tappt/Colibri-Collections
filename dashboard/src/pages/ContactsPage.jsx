import { useState, useEffect, useCallback } from 'react'
import { Search, Users, Loader2, ChevronLeft, ChevronRight, UserPlus, X, CheckCircle2, AlertCircle } from 'lucide-react'
import StatusBadge from '../components/shared/StatusBadge.jsx'
import { contactsAPI } from '../lib/api.js'

const PAGE_SIZE = 50

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

const EMPTY_FORM = { nombre: '', apellido: '', telefono: '', grupo: '', payment_link: '' }

function AddContactModal({ onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await contactsAPI.create({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim() || undefined,
        telefono: form.telefono.trim(),
        grupo: form.grupo.trim() || undefined,
        payment_link: form.payment_link.trim() || undefined
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <UserPlus size={16} className="text-colibri" /> Agregar contacto
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre <span className="text-red-400">*</span></label>
              <input className="input" value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="María" required />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input className="input" value={form.apellido}
                onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))}
                placeholder="González" />
            </div>
          </div>

          <div>
            <label className="label">Teléfono (WhatsApp) <span className="text-red-400">*</span></label>
            <input className="input font-mono" value={form.telefono}
              onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
              placeholder="+521XXXXXXXXXX" required />
            <p className="text-xs text-gray-400 mt-1">Incluye código de país, ej. +5215512345678</p>
          </div>

          <div>
            <label className="label">Grupo / Segmento</label>
            <input className="input" value={form.grupo}
              onChange={e => setForm(f => ({ ...f, grupo: e.target.value }))}
              placeholder="Ej. Torre A, 3ro B, Membresía Oro" />
          </div>

          <div>
            <label className="label">Liga de pago individual <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input className="input" value={form.payment_link}
              onChange={e => setForm(f => ({ ...f, payment_link: e.target.value }))}
              placeholder="https://..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 btn border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm py-2.5 rounded-xl font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm py-2.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              {saving ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => { setPage(0) }, [debouncedSearch])

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

  const handleSaved = () => {
    setShowModal(false)
    setJustAdded(true)
    load()
    setTimeout(() => setJustAdded(false), 3000)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {showModal && <AddContactModal onClose={() => setShowModal(false)} onSaved={handleSaved} />}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
          <p className="text-gray-500 text-sm mt-1">{total.toLocaleString('es-MX')} contactos registrados</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <UserPlus size={15} /> Agregar contacto
        </button>
      </div>

      {/* Success toast */}
      {justAdded && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          <CheckCircle2 size={15} /> Contacto agregado correctamente
        </div>
      )}

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
            <p className="text-gray-400 text-sm mt-1 mb-4">
              {search ? 'Intenta con otro término' : 'Agrega tu primer contacto o sube un archivo Excel desde campañas'}
            </p>
            {!search && (
              <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2 text-sm">
                <UserPlus size={14} /> Agregar contacto
              </button>
            )}
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-colibri hover:text-colibri disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-gray-600 px-2 py-1">{page + 1} / {totalPages}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-colibri hover:text-colibri disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
