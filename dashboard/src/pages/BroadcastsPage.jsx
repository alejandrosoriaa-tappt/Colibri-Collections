import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Radio, Plus, X, Loader2, AlertCircle, CheckCircle2,
  Users, Send, FileText, Eye
} from 'lucide-react'
import { broadcastsAPI } from '../lib/api.js'
import useAuthStore from '../store/authStore.js'

const VARIABLES_HELP = [
  { var: '{nombre}', desc: 'Nombre del contacto' },
  { var: '{grupo}',  desc: 'Grupo del contacto' }
]

const EMPTY_FORM = {
  title: '',
  message: '',
  group_filters: [],   // array of selected groups (empty = todos)
  media_url: '',
}

function BroadcastCard({ broadcast }) {
  const successRate = broadcast.total_contacts > 0
    ? Math.round((broadcast.sent_count / broadcast.total_contacts) * 100)
    : 0

  const formattedDate = new Date(broadcast.sent_at || broadcast.created_at)
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{broadcast.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{formattedDate}</p>
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
          broadcast.status === 'sent'
            ? 'bg-green-100 text-green-700'
            : broadcast.status === 'sending'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {broadcast.status === 'sent' ? 'Enviado' : broadcast.status === 'sending' ? 'Enviando…' : broadcast.status}
        </span>
      </div>

      {broadcast.group_filter && (
        <div className="flex items-center gap-1.5 mb-3">
          <Users size={12} className="text-gray-400" />
          <span className="text-xs text-gray-500">{broadcast.group_filter}</span>
        </div>
      )}

      <p className="text-sm text-gray-600 line-clamp-2 mb-4">{broadcast.message}</p>

      {broadcast.media_url && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mb-4">
          <FileText size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500 truncate">{broadcast.media_filename || 'Documento adjunto'}</span>
        </div>
      )}

      <div className="border-t border-gray-100 pt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-gray-900">{broadcast.total_contacts}</p>
          <p className="text-xs text-gray-400">Destinatarios</p>
        </div>
        <div>
          <p className="text-lg font-bold text-green-600">{broadcast.sent_count}</p>
          <p className="text-xs text-gray-400">Enviados</p>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">{successRate}%</p>
          <p className="text-xs text-gray-400">Éxito</p>
        </div>
      </div>
    </div>
  )
}

export default function BroadcastsPage() {
  const { tenant } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [broadcasts, setBroadcasts] = useState([])
  const [groups, setGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [groupFilter, setGroupFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [previewCount, setPreviewCount] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [showVars, setShowVars] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      broadcastsAPI.list(),
      broadcastsAPI.groups()
    ])
      .then(([bRes, gRes]) => {
        setBroadcasts(bRes.data.broadcasts || [])
        setGroups(gRes.data.groups || [])
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-open form if navigated with ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true)
      setForm(EMPTY_FORM)
      setFormError(null)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams])

  // Preview count when group selection changes
  useEffect(() => {
    if (!showForm) return
    setPreviewCount(null)
    const groupParam = form.group_filters.length > 0 ? form.group_filters.join(',') : undefined
    broadcastsAPI.preview(groupParam)
      .then(res => setPreviewCount(res.data.count))
      .catch(() => setPreviewCount(null))
  }, [form.group_filters, showForm])

  const toggleGroup = (g) => {
    setForm(f => ({
      ...f,
      group_filters: f.group_filters.includes(g)
        ? f.group_filters.filter(x => x !== g)
        : [...f.group_filters, g]
    }))
  }

  const filtered = groupFilter
    ? broadcasts.filter(b => {
        if (!b.group_filter) return false
        // Support both single group ("1°A") and multi-group ("1°A, 1°B")
        return b.group_filter.split(', ').map(s => s.trim()).includes(groupFilter)
      })
    : broadcasts

  const handleSend = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.message.trim()) return
    setFormError(null)
    setIsSending(true)
    try {
      await broadcastsAPI.send({
        title: form.title.trim(),
        message: form.message.trim(),
        group_filters: form.group_filters.length > 0 ? form.group_filters : null,
        media_url: form.media_url.trim() || null,
        media_type: form.media_url ? 'document' : null,
        media_filename: form.media_url ? form.media_url.split('/').pop() : null
      })
      setShowForm(false)
      setForm(EMPTY_FORM)
      setSuccessMsg(`Comunicado "${form.title}" enviado correctamente`)
      setTimeout(() => setSuccessMsg(null), 5000)
      setIsLoading(true)
      load()
    } catch (err) {
      setFormError(err.response?.data?.error || err.message)
    } finally {
      setIsSending(false)
    }
  }

  const insertVar = (v) => {
    setForm(f => ({ ...f, message: f.message + v }))
  }

  const openForm = () => {
    setForm(EMPTY_FORM)
    setFormError(null)
    setPreviewCount(null)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comunicados</h1>
          <p className="text-gray-500 text-sm mt-1">
            Envía mensajes e información segmentada a tus contactos
          </p>
        </div>
        <button onClick={openForm} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} />
          Nuevo comunicado
        </button>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}

      {/* Group filters */}
      {groups.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setGroupFilter('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              groupFilter === ''
                ? 'bg-colibri text-white border-colibri'
                : 'bg-white text-gray-600 border-gray-200 hover:border-colibri hover:text-colibri'
            }`}
          >
            Todos
          </button>
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setGroupFilter(g)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                groupFilter === g
                  ? 'bg-colibri text-white border-colibri'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-colibri hover:text-colibri'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="text-colibri animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Radio size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {groupFilter ? `Sin comunicados para "${groupFilter}"` : 'Aún no has enviado comunicados'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Envía avisos, documentos o información a grupos específicos de contactos
          </p>
          {!groupFilter && (
            <button onClick={openForm} className="btn-primary inline-flex items-center gap-2 mt-4 text-sm">
              <Plus size={15} /> Crear primer comunicado
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(b => (
            <BroadcastCard key={b.id} broadcast={b} />
          ))}
        </div>
      )}

      {/* New broadcast modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Nuevo comunicado</h2>
                <p className="text-xs text-gray-400 mt-0.5">Se enviará por WhatsApp a los contactos seleccionados</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSend} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="label">Título del comunicado *</label>
                <input
                  className="input"
                  placeholder="Ej. Aviso de asamblea junio, Circular mantenimiento..."
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>

              {/* Group selector — multi-select pills */}
              <div>
                <label className="label">Destinatarios</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, group_filters: [] }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.group_filters.length === 0
                        ? 'bg-colibri text-white border-colibri'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-colibri hover:text-colibri'
                    }`}
                  >
                    Todos
                  </button>
                  {groups.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGroup(g)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        form.group_filters.includes(g)
                          ? 'bg-colibri text-white border-colibri'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-colibri hover:text-colibri'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                {form.group_filters.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Seleccionados: {form.group_filters.join(', ')}
                  </p>
                )}

                {/* Preview count */}
                {previewCount !== null && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Eye size={13} className="text-colibri" />
                    <span className="text-xs text-colibri font-medium">
                      {previewCount} contacto{previewCount !== 1 ? 's' : ''} recibirán este mensaje
                    </span>
                  </div>
                )}
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Mensaje *</label>
                  <button
                    type="button"
                    onClick={() => setShowVars(!showVars)}
                    className="text-xs text-colibri hover:underline"
                  >
                    {showVars ? 'Ocultar variables' : '+ Insertar variable'}
                  </button>
                </div>

                {showVars && (
                  <div className="mb-2 space-y-2">
                    <p className="text-xs text-md-on-surface-variant leading-relaxed">
                      Las <strong>variables</strong> son datos que Kollybry reemplaza automáticamente por la información de cada contacto al momento de enviar. Por ejemplo, si escribes <code className="bg-md-surface-container px-1 rounded text-xs">{'{nombre}'}</code>, cada papá recibirá el mensaje con su nombre real.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {VARIABLES_HELP.map(v => (
                        <button
                          key={v.var}
                          type="button"
                          onClick={() => insertVar(v.var)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-md-primary-container/40 border border-md-primary/20 rounded-xl text-xs text-md-primary font-mono hover:bg-md-primary-container transition-colors"
                          title={v.desc}
                        >
                          <span>{v.var}</span>
                          <span className="text-md-on-surface-variant font-sans font-normal">→ {v.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  className="input resize-none"
                  rows={5}
                  placeholder={`Hola {nombre}, te informamos que la asamblea ordinaria de ${tenant?.display_name || 'la organización'} se realizará el próximo viernes 14 de junio a las 7pm en el salón de usos múltiples. Tu asistencia es importante.`}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  required
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-400">{form.message.length} caracteres</p>
                  <div className="flex gap-1.5">
                    {['{nombre}', '{apellido}', '{nombre_completo}'].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, message: f.message + v }))}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-md-primary-container text-md-on-primary-container hover:bg-md-primary hover:text-white transition-colors font-mono"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-md-on-surface-variant mt-0.5">
                  Las variables se reemplazan con el nombre de cada destinatario al enviar.
                </p>
              </div>

              {/* Optional doc link */}
              <div>
                <label className="label">Enlace a documento (opcional)</label>
                <input
                  className="input"
                  type="url"
                  placeholder="https://drive.google.com/... o cualquier URL pública"
                  value={form.media_url}
                  onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Pega el enlace de un PDF en Google Drive, Dropbox, etc. Se incluirá en el mensaje.
                </p>
              </div>

              {/* Preview */}
              {(form.message || form.media_url) && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Vista previa del mensaje</p>
                  <div className="bg-white rounded-xl p-3 shadow-sm max-w-xs">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {form.message
                        .replace(/{nombre}/g, 'Roberto')
                        .replace(/{grupo}/g, form.group_filters[0] || 'Grupo A')}
                    </p>
                    {form.media_url && (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded-lg">
                        <FileText size={14} className="text-blue-500" />
                        <span className="text-xs text-blue-600 truncate">{form.media_url.split('/').pop() || 'Documento'}</span>
                      </div>
                    )}
                    <p className="text-right text-xs text-gray-300 mt-1">✓✓</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={isSending}
                >
                  {isSending
                    ? <><Loader2 size={15} className="animate-spin" /> Enviando…</>
                    : <><Send size={15} /> Enviar ahora</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
