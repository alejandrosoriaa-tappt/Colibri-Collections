import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Play, Pause, Edit2, Save, X, CheckCircle2,
  Circle, Users, DollarSign, AlertCircle, MessageSquare, Upload
} from 'lucide-react'
import StatusBadge from '../components/shared/StatusBadge.jsx'
import { campaignsAPI, invoicesAPI } from '../lib/api.js'

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

function InvoiceRow({ invoice, onMarkPaid }) {
  const contact = invoice.contacts || {}
  const name = [contact.nombre, contact.apellido].filter(Boolean).join(' ') || '—'
  const isPaid = invoice.status === 'paid'
  const isSuspended = invoice.status === 'suspended'

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4 text-sm font-medium text-gray-900">{name}</td>
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

function MessageEditor({ msg, onSave }) {
  const [editing, setEditing] = useState(false)
  const [template, setTemplate] = useState(msg.message_template)
  const [isSaving, setIsSaving] = useState(false)

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

  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
            msg.sent_at ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}>
            {msg.sent_at ? <CheckCircle2 size={11} /> : <Circle size={11} />}
            Mensaje {msg.message_number}
          </span>
          <span className="text-xs text-gray-400">Día {msg.trigger_day} · {msg.send_to === 'unpaid' ? 'Solo pendientes' : 'Todos'}</span>
        </div>
        {!msg.sent_at && (
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            className="flex items-center gap-1 text-xs font-medium text-colibri hover:text-colibri-dark"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : editing ? <Save size={12} /> : <Edit2 size={12} />}
            {editing ? 'Guardar' : 'Editar'}
          </button>
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
  const [campaign, setCampaign] = useState(null)
  const [messages, setMessages] = useState([])
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isActing, setIsActing] = useState(false)
  const [activeTab, setActiveTab] = useState('mensajes')
  const [markingInvoice, setMarkingInvoice] = useState(null)
  const [payRef, setPayRef] = useState('')

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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Contactos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{campaign.total_contacts}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Pagados</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{campaign.paid_count} <span className="text-sm text-gray-400">({paidPct}%)</span></p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Cobrado</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(campaign.paid_amount)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Por cobrar</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">
            {formatCurrency((campaign.total_amount || 0) - (campaign.paid_amount || 0))}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {[
            { key: 'mensajes', label: 'Mensajes', icon: MessageSquare },
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
          {messages.map(msg => (
            <MessageEditor key={msg.id} msg={msg} onSave={handleSaveMessage} />
          ))}
        </div>
      )}

      {activeTab === 'facturas' && (
        <div className="card p-0 overflow-hidden">
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <Users size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Aún no hay contactos en esta campaña</p>
              <Link
                to={`/upload?campaign=${id}`}
                className="btn-primary inline-flex items-center gap-2 mt-4 text-sm"
              >
                <Upload size={14} /> Subir archivo
              </Link>
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
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
