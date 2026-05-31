import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Play, Pause, Edit2, Save, X, CheckCircle2,
  Circle, Users, AlertCircle, MessageSquare, Upload, TrendingUp, Send,
  UserPlus, Search
} from 'lucide-react'
import StatusBadge from '../components/shared/StatusBadge.jsx'
import KpiBar from '../components/shared/KpiBar.jsx'
import { campaignsAPI, invoicesAPI, contactsAPI } from '../lib/api.js'
import useAuthStore from '../store/authStore.js'
import { getOrgConfig } from '../config/orgTypeConfig.js'

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 0
  }).format(Number(amount) || 0).replace('MX$', '$')
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

function InvoiceRow({ invoice, onMarkPaid, orgConfig }) {
  const contact = invoice.contacts || {}
  const name = [contact.nombre, contact.apellido].filter(Boolean).join(' ') || '—'
  const isPaid = invoice.status === 'paid'
  const isSuspended = invoice.status === 'suspended'

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4">
        <p className="text-sm font-medium text-gray-900">{name}</p>
        {contact.nombre_alumno && orgConfig?.hasStudent && (
          <p className="text-xs text-gray-400 mt-0.5">{orgConfig.studentLabel}: {contact.nombre_alumno}</p>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">{contact.telefono}</td>
      <td className="py-3 px-4 text-sm font-semibold text-gray-900">{formatCurrency(invoice.monto)}</td>
      <td className="py-3 px-4">
        <StatusBadge status={invoice.status} size="xs" />
      </td>
      <td className="py-3 px-4 text-sm text-gray-400">{invoice.paid_at ? formatDate(invoice.paid_at) : '—'}</td>
      <td className="py-3 px-4">
        {!isPaid && !isSuspended && (
          <button
            onClick={() => onMarkPaid(invoice)}
            className="text-xs font-medium text-colibri hover:text-colibri-dark flex items-center gap-1"
          >
            <CheckCircle2 size={13} /> Marcar pagado
          </button>
        )}
      </td>
    </tr>
  )
}

function MessageEditor({ msg, onSave, onSend }) {
  const [editing, setEditing] = useState(false)
  const [template, setTemplate] = useState(msg.message_template)
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(msg.id, { message_template: template })
      setEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSend = async () => {
    const ordinal = msg.message_number === 1 ? '1er' : msg.message_number === 2 ? '2do' : msg.message_number === 3 ? '3er' : `${msg.message_number}to`
    if (!window.confirm(`¿Enviar el ${ordinal} recordatorio ahora a todos los contactos aplicables? Esta acción es irreversible.`)) return
    setIsSending(true)
    setSendResult(null)
    try {
      const res = await onSend(msg.id)
      setSendResult({ ok: true, sent: res.sent, failed: res.failed, total: res.total })
    } catch (err) {
      setSendResult({ ok: false, error: err.response?.data?.error || err.message })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
            msg.sent_at ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            {msg.sent_at ? <CheckCircle2 size={11} /> : <Circle size={11} />}
            {msg.message_number === 1 ? '1er' : msg.message_number === 2 ? '2do' : msg.message_number === 3 ? '3er' : `${msg.message_number}to`} recordatorio
          </span>
          <span className="text-xs text-gray-400">Día {msg.trigger_day} · {msg.send_to === 'unpaid' ? 'Solo pendientes' : 'Todos'}</span>
        </div>
        {!msg.sent_at && (
          <div className="flex items-center gap-3">
            {!editing && (
              <button
                onClick={handleSend}
                disabled={isSending}
                className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700"
              >
                {isSending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                {isSending ? 'Enviando...' : 'Enviar ahora'}
              </button>
            )}
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              className="flex items-center gap-1 text-xs font-medium text-colibri hover:text-colibri-dark"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : editing ? <Save size={12} /> : <Edit2 size={12} />}
              {editing ? 'Guardar' : 'Editar'}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          className="input text-sm font-mono"
          rows={4}
          value={template}
          onChange={e => setTemplate(e.target.value)}
        />
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{msg.message_template}</p>
      )}

      {sendResult && (
        <div className={`mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
          sendResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {sendResult.ok
            ? <><CheckCircle2 size={13} /> Enviado: {sendResult.sent} exitosos, {sendResult.failed} fallidos de {sendResult.total} contactos</>
            : <><AlertCircle size={13} /> Error: {sendResult.error}</>
          }
        </div>
      )}

      {msg.sent_at && (
        <p className="text-xs text-gray-400 mt-2">
          Enviado el {formatDate(msg.sent_at)} · {msg.sent_count} exitosos · {msg.failed_count} fallidos
        </p>
      )}
    </div>
  )
}

export default function CampaignDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tenant } = useAuthStore()
  const orgConfig = getOrgConfig(tenant?.org_type)
  const [campaign, setCampaign] = useState(null)
  const [messages, setMessages] = useState([])
  const [invoices, setInvoices] = useState([])
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isActing, setIsActing] = useState(false)
  const [activeTab, setActiveTab] = useState('mensajes')
  const [markingInvoice, setMarkingInvoice] = useState(null)
  const [payRef, setPayRef] = useState('')
  const [showAddContacts, setShowAddContacts] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState([])
  const [contactSearchLoading, setContactSearchLoading] = useState(false)
  const [selectedContactIds, setSelectedContactIds] = useState(new Set())
  const [addingContacts, setAddingContacts] = useState(false)
  const [populatingGroup, setPopulatingGroup] = useState(false)

  const loadInvoices = async (status = '') => {
    try {
      const invoicesRes = await campaignsAPI.getInvoices(id, status ? { status } : {})
      setInvoices(invoicesRes.data.invoices || [])
    } catch (err) {
      console.error(err)
    }
  }

  const load = async () => {
    try {
      const [detailRes, invoicesRes] = await Promise.all([
        campaignsAPI.get(id),
        campaignsAPI.getInvoices(id)
      ])
      setCampaign(detailRes.data.campaign)
      setMessages(detailRes.data.messages || [])
      setInvoices(invoicesRes.data.invoices || [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  // Contact search for "add contacts" modal
  useEffect(() => {
    if (!showAddContacts) return
    const t = setTimeout(async () => {
      setContactSearchLoading(true)
      try {
        const res = await contactsAPI.list({ limit: 30, status: 'active', ...(contactSearch ? { search: contactSearch } : {}) })
        setContactResults(res.data.contacts || [])
      } catch {
        setContactResults([])
      } finally {
        setContactSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [contactSearch, showAddContacts])

  const handlePopulateFromGroup = async () => {
    setPopulatingGroup(true)
    try {
      await campaignsAPI.populateFromGroup(id)
      load()
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setPopulatingGroup(false)
    }
  }

  const handleAddContacts = async () => {
    if (selectedContactIds.size === 0) return
    setAddingContacts(true)
    try {
      await campaignsAPI.addContacts(id, { contact_ids: [...selectedContactIds], monto: 0 })
      setShowAddContacts(false)
      setSelectedContactIds(new Set())
      setContactSearch('')
      load()
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setAddingContacts(false)
    }
  }

  const handleActivate = async () => {
    setIsActing(true)
    try {
      const res = await campaignsAPI.activate(id)
      setCampaign(res.data.campaign)
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setIsActing(false)
    }
  }

  const handlePause = async () => {
    setIsActing(true)
    try {
      const res = await campaignsAPI.pause(id)
      setCampaign(res.data.campaign)
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setIsActing(false)
    }
  }

  const handleSaveMessage = async (msgId, updates) => {
    await campaignsAPI.updateMessage(id, msgId, updates)
    setMessages(msgs => msgs.map(m => m.id === msgId ? { ...m, ...updates } : m))
  }

  const handleSendMessage = async (msgId) => {
    const res = await campaignsAPI.sendMessage(id, msgId)
    // Refresh messages to reflect sent_at update
    const detailRes = await campaignsAPI.get(id)
    setMessages(detailRes.data.messages || [])
    setCampaign(detailRes.data.campaign)
    return res.data
  }

  const handleMarkPaid = async () => {
    if (!markingInvoice) return
    try {
      await invoicesAPI.markPaid(markingInvoice.id, { reference: payRef })
      setMarkingInvoice(null)
      setPayRef('')
      load()
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="text-colibri animate-spin" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="card text-center py-12">
        <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
        <p className="text-gray-500">Campaña no encontrada</p>
        <Link to="/campaigns" className="btn-primary inline-flex items-center gap-2 mt-4 text-sm">
          <ArrowLeft size={15} /> Volver
        </Link>
      </div>
    )
  }

  // Communication stats from message logs
  const enviados = messages.reduce((acc, m) => acc + (m.sent_count || 0), 0)
  const entregados = campaign.msg_stats?.delivered || 0
  const leidos = campaign.msg_stats?.read || 0
  const clicks = 0 // pending link tracking

  // Financial stats (secondary)
  const paidPct = campaign.total_contacts > 0
    ? Math.round((campaign.paid_count / campaign.total_contacts) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => navigate('/campaigns')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} /> Campañas
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="text-gray-500 text-sm mt-1">{campaign.concept}</p>
          </div>

          <div className="flex gap-2">
            <Link
              to={`/upload?campaign=${id}`}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Upload size={15} /> Subir contactos
            </Link>

            {campaign.status === 'draft' && (
              <button
                onClick={handleActivate}
                disabled={isActing}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {isActing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Activar
              </button>
            )}
            {campaign.status === 'active' && (
              <button
                onClick={handlePause}
                disabled={isActing}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {isActing ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
                Pausar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPIs comunicación */}
      <KpiBar enviados={enviados} entregados={entregados} leidos={leidos} clicks={clicks} />

      {/* Resumen de cobranza (secundario) */}
      {campaign.total_contacts > 0 && (
        <div className="card flex flex-wrap items-center gap-6 py-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-gray-400" />
            <span className="text-sm text-gray-500">Cobranza:</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-gray-900">{campaign.paid_count || 0}</span>
            <span className="text-xs text-gray-400">de {campaign.total_contacts} pagaron</span>
            <span className="text-xs font-medium text-green-600 ml-1">({paidPct}%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Cobrado:</span>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(campaign.paid_amount)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Por cobrar:</span>
            <span className="text-sm font-semibold text-orange-500">
              {formatCurrency((campaign.total_amount || 0) - (campaign.paid_amount || 0))}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {[
            { key: 'mensajes', label: 'Recordatorios', icon: MessageSquare },
            { key: 'facturas', label: `Contactos (${invoices.length})`, icon: Users }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'border-colibri text-colibri'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'mensajes' && (
        <div className="space-y-3">
          {/* M1/M2 explanation */}
          <div className="flex items-start gap-2.5 p-3 bg-md-primary-container/30 rounded-2xl">
            <span className="text-base flex-shrink-0">💡</span>
            <p className="text-xs text-md-on-surface-variant leading-relaxed">
              <strong className="text-md-on-surface">¿Qué son M1, M2, M3...?</strong>{' '}
              Son los recordatorios de la campaña en orden cronológico. M1 es el primer aviso (antes o en la fecha de vencimiento), M2 es el segundo recordatorio para quienes no han pagado, y así sucesivamente. Puedes editar el texto de cada uno antes de enviarlo.
            </p>
          </div>
          {messages.map(msg => (
            <MessageEditor key={msg.id} msg={msg} onSave={handleSaveMessage} onSend={handleSendMessage} />
          ))}
        </div>
      )}

      {activeTab === 'facturas' && (
        <>
          <div className="flex gap-2 flex-wrap items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {[
                { value: '', label: 'Todos' },
                { value: 'pending', label: 'Pendientes' },
                { value: 'paid', label: 'Pagados' },
                { value: 'suspended', label: 'Suspendidos' }
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => { setInvoiceStatusFilter(f.value); loadInvoices(f.value) }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    invoiceStatusFilter === f.value
                      ? 'bg-colibri text-white border-colibri'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-colibri hover:text-colibri'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setShowAddContacts(true); setSelectedContactIds(new Set()); setContactSearch('') }}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <UserPlus size={14} /> Agregar contacto
            </button>
          </div>

        {/* Auto-populate banner: show when grupo_filter is set but no contacts yet */}
        {invoices.length === 0 && !invoiceStatusFilter && campaign.grupo_filter && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <Users size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900">
                Esta campaña está configurada para el grupo <strong>"{campaign.grupo_filter}"</strong>
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                Puedes agregar automáticamente todos los contactos de ese grupo.
              </p>
            </div>
            <button
              onClick={handlePopulateFromGroup}
              disabled={populatingGroup}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition-colors flex-shrink-0"
            >
              {populatingGroup ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
              Agregar grupo
            </button>
          </div>
        )}

        <div className="card p-0 overflow-hidden">
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <Users size={36} className="text-gray-300 mx-auto mb-3" />
              {invoiceStatusFilter ? (
                <p className="text-gray-500 text-sm">No hay contactos con este estado</p>
              ) : (
                <>
                  <p className="text-gray-500 text-sm">Aún no hay contactos en esta campaña</p>
                  <Link
                    to={`/upload?campaign=${id}`}
                    className="btn-primary inline-flex items-center gap-2 mt-4 text-sm"
                  >
                    <Upload size={14} /> Subir archivo
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    {['Nombre', 'Teléfono', 'Monto', 'Estado', 'Pago', ''].map(h => (
                      <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <InvoiceRow
                      key={inv.id}
                      invoice={inv}
                      onMarkPaid={setMarkingInvoice}
                      orgConfig={orgConfig}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}

      {/* Add contacts modal */}
      {showAddContacts && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <UserPlus size={16} className="text-colibri" /> Agregar contactos a campaña
              </h3>
              <button onClick={() => setShowAddContacts(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 flex-shrink-0 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="input pl-9 text-sm"
                  placeholder={orgConfig.searchPlaceholder}
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {selectedContactIds.size > 0 && (
                <p className="text-xs text-colibri mt-2 font-medium">
                  {selectedContactIds.size} contacto{selectedContactIds.size !== 1 ? 's' : ''} seleccionado{selectedContactIds.size !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {contactSearchLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={18} className="text-colibri animate-spin" />
                </div>
              ) : contactResults.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No se encontraron contactos</p>
              ) : (
                contactResults.map(c => {
                  const checked = selectedContactIds.has(c.id)
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors ${checked ? 'bg-colibri/5' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedContactIds(prev => {
                            const next = new Set(prev)
                            if (next.has(c.id)) next.delete(c.id)
                            else next.add(c.id)
                            return next
                          })
                        }}
                        className="accent-colibri rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {[c.nombre, c.apellido].filter(Boolean).join(' ')}
                        </p>
                        {c.nombre_alumno && orgConfig.hasStudent && (
                          <p className="text-xs text-gray-400">{orgConfig.studentLabel}: {c.nombre_alumno}</p>
                        )}
                        <p className="text-xs text-gray-400 font-mono">{c.telefono}</p>
                      </div>
                      {c.grupo && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">{c.grupo}</span>
                      )}
                    </label>
                  )
                })
              )}
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setShowAddContacts(false)} className="flex-1 btn-secondary text-sm">
                Cancelar
              </button>
              <button
                onClick={handleAddContacts}
                disabled={selectedContactIds.size === 0 || addingContacts}
                className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm"
              >
                {addingContacts ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {addingContacts ? 'Agregando...' : `Agregar ${selectedContactIds.size > 0 ? selectedContactIds.size : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark paid modal */}
      {markingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Marcar como pagado</h3>
            <p className="text-sm text-gray-600 mb-4">
              {[markingInvoice.contacts?.nombre, markingInvoice.contacts?.apellido].filter(Boolean).join(' ')} ·{' '}
              {formatCurrency(markingInvoice.monto)}
            </p>
            <div className="mb-4">
              <label className="label">Referencia de pago (opcional)</label>
              <input
                className="input"
                placeholder="Folio, transferencia, etc."
                value={payRef}
                onChange={e => setPayRef(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setMarkingInvoice(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleMarkPaid} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <CheckCircle2 size={15} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
