import { useState, useEffect } from 'react'
import { Megaphone, Plus, Loader2, X, AlertCircle } from 'lucide-react'
import CampaignCard from '../components/campaigns/CampaignCard.jsx'
import StatusBadge from '../components/shared/StatusBadge.jsx'
import { campaignsAPI } from '../lib/api.js'

const STATUS_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'draft', label: 'Borradores' },
  { value: 'paused', label: 'Pausadas' },
  { value: 'completed', label: 'Completadas' }
]

const CONCEPTOS = [
  'Colegiatura',
  'Mensualidad',
  'Membresía',
  'Cuota',
  'Renta',
  'Servicio',
  'Inscripción',
  'Comunicado',
  'Otro'
]

const MESES = [
  { value: '1',  label: 'Enero'      },
  { value: '2',  label: 'Febrero'    },
  { value: '3',  label: 'Marzo'      },
  { value: '4',  label: 'Abril'      },
  { value: '5',  label: 'Mayo'       },
  { value: '6',  label: 'Junio'      },
  { value: '7',  label: 'Julio'      },
  { value: '8',  label: 'Agosto'     },
  { value: '9',  label: 'Septiembre' },
  { value: '10', label: 'Octubre'    },
  { value: '11', label: 'Noviembre'  },
  { value: '12', label: 'Diciembre'  }
]

const currentYear = new Date().getFullYear()
const AÑOS = [currentYear - 1, currentYear, currentYear + 1].map(y => String(y))

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

const EMPTY_FORM = {
  name: '',
  concept: '',
  billing_month: String(new Date().getMonth() + 1),
  billing_year: String(currentYear),
  late_fee_pct: ''
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const load = () => {
    campaignsAPI.list()
      .then(res => setCampaigns(res.data.campaigns || []))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = statusFilter
    ? campaigns.filter(c => c.status === statusFilter)
    : campaigns

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError(null)
    setIsSaving(true)
    try {
      const y = Number(form.billing_year)
      const m = Number(form.billing_month)
      const mm = String(m).padStart(2, '0')
      const last = lastDayOfMonth(y, m)
      const payload = {
        name:             form.name.trim(),
        concept:          form.concept,
        cycle_start_date: `${y}-${mm}-01`,
        due_date:         `${y}-${mm}-${last}`,
        cycle_end_date:   `${y}-${mm}-${last}`,
        late_fee_pct:     form.late_fee_pct ? Number(form.late_fee_pct) : 0
      }
      await campaignsAPI.create(payload)
      setShowForm(false)
      setForm(EMPTY_FORM)
      setIsLoading(true)
      load()
    } catch (err) {
      setFormError(err.response?.data?.error || err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campañas</h1>
          <p className="text-gray-500 text-sm mt-1">{campaigns.length} campañas registradas</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(null); setForm(EMPTY_FORM) }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          Nueva campaña
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              statusFilter === f.value
                ? 'bg-colibri text-white border-colibri'
                : 'bg-white text-gray-600 border-gray-200 hover:border-colibri hover:text-colibri'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="text-colibri animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-14">
          <Megaphone size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {statusFilter ? 'No hay campañas con este estado' : 'Aún no tienes campañas'}
          </p>
          {!statusFilter && (
            <button
              onClick={() => { setShowForm(true); setFormError(null) }}
              className="btn-primary inline-flex items-center gap-2 mt-4 text-sm"
            >
              <Plus size={15} /> Crear primera campaña
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(c => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}

      {/* Create campaign modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Nueva campaña</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{formError}</p>
                </div>
              )}

              <div>
                <label className="label">Nombre de la campaña *</label>
                <input
                  className="input"
                  placeholder="Ej. Mensualidades Mayo 2025"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">Concepto de mensaje *</label>
                <select
                  className="input"
                  value={form.concept}
                  onChange={e => setForm(f => ({ ...f, concept: e.target.value }))}
                  required
                >
                  <option value="">-- Selecciona un concepto --</option>
                  {CONCEPTOS.map(c => (
                    <option key={c} value={c.toLowerCase()}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Mes *</label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="input"
                    value={form.billing_month}
                    onChange={e => setForm(f => ({ ...f, billing_month: e.target.value }))}
                    required
                  >
                    {MESES.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    className="input"
                    value={form.billing_year}
                    onChange={e => setForm(f => ({ ...f, billing_year: e.target.value }))}
                    required
                  >
                    {AÑOS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  El ciclo abarcará del 1 al último día del mes seleccionado.
                </p>
              </div>

<p className="text-xs text-gray-400">
                Se crearán automáticamente 4 mensajes de WhatsApp con plantillas predeterminadas. Podrás editarlos después.
              </p>

              <div className="flex gap-3 pt-2">
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
                  disabled={isSaving}
                >
                  {isSaving && <Loader2 size={15} className="animate-spin" />}
                  {isSaving ? 'Creando...' : 'Crear campaña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
