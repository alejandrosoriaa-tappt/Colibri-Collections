import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import StatusBadge from '../components/shared/StatusBadge.jsx'
import { messagesAPI, campaignsAPI } from '../lib/api.js'

const PAGE_SIZE = 50

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

export default function MessagesPage() {
  const [messages, setMessages] = useState([])
  const [total, setTotal] = useState(0)
  const [campaigns, setCampaigns] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [campaignFilter, setCampaignFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    campaignsAPI.list()
      .then(res => setCampaigns(res.data.campaigns || []))
      .catch(console.error)
  }, [])

  const load = useCallback(() => {
    setIsLoading(true)
    const params = {
      limit: PAGE_SIZE,
      page: page + 1,
      ...(campaignFilter ? { campaign_id: campaignFilter } : {})
    }
    messagesAPI.list(params)
      .then(res => {
        setMessages(res.data.messages || [])
        setTotal(res.data.total || (res.data.messages?.length || 0))
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [page, campaignFilter])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mensajes enviados</h1>
        <p className="text-gray-500 text-sm mt-1">Historial de mensajes de WhatsApp</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          className="input max-w-xs"
          value={campaignFilter}
          onChange={e => { setCampaignFilter(e.target.value); setPage(0) }}
        >
          <option value="">Todas las campañas</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-colibri animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-14">
            <MessageSquare size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No hay mensajes aún</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    {['Contacto', 'Campaña', 'Mensaje', 'Estado', 'Enviado'].map(h => (
                      <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {messages.map(msg => {
                    const contact = msg.contacts || {}
                    const campaign = msg.campaigns || {}
                    const name = [contact.nombre, contact.apellido].filter(Boolean).join(' ') || msg.phone
                    const isExpanded = expandedId === msg.id

                    return (
                      <tr
                        key={msg.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                      >
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-gray-900">{name}</p>
                          <p className="text-xs text-gray-400 font-mono">{msg.phone}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-600">{campaign.name || '—'}</p>
                          {msg.message_number && (
                            <p className="text-xs text-gray-400">M{msg.message_number}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className={`text-sm text-gray-700 ${isExpanded ? 'whitespace-pre-wrap' : 'truncate'}`}>
                            {msg.message_text}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={msg.status} size="xs" />
                          {msg.error_message && (
                            <p className="text-xs text-red-500 mt-1 truncate max-w-[120px]">{msg.error_message}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400 whitespace-nowrap">
                          {formatDateTime(msg.sent_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

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
                  <span className="text-sm text-gray-600 px-2 py-1">{page + 1} / {totalPages}</span>
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
