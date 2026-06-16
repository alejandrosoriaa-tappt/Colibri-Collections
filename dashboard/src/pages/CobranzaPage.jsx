import { useState, useRef, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, FileSpreadsheet, Loader2, AlertCircle, AlertTriangle,
  CircleDollarSign, Check, Users, ChevronDown, ChevronRight, RotateCcw
} from 'lucide-react'
import { cobranzaAPI } from '../lib/api.js'

const VARIABLES = ['{nombre}', '{alumno}', '{monto}', '{liga_pago}', '{concept}', '{nombre_org}']

const VAR_LABELS = {
  nombre:     { label: 'Nombre',       color: 'bg-blue-100 text-blue-700 border-blue-200' },
  alumno:     { label: 'Alumno',       color: 'bg-purple-100 text-purple-700 border-purple-200' },
  monto:      { label: 'Monto',        color: 'bg-green-100 text-green-700 border-green-200' },
  liga_pago:  { label: 'Liga de pago', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  concept:    { label: 'Concepto',     color: 'bg-teal-100 text-teal-700 border-teal-200' },
  nombre_org: { label: 'Colegio',      color: 'bg-pink-100 text-pink-700 border-pink-200' },
}

function MessageBubble({ text }) {
  const parts = text.split(/(\{[^}]+\})/g)
  return (
    <div className="text-sm leading-relaxed text-md-on-surface">
      {parts.map((part, i) => {
        const m = part.match(/^\{([^}]+)\}$/)
        if (m) {
          const meta = VAR_LABELS[m[1]]
          return (
            <span key={i} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border mx-0.5 ${meta ? meta.color : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {meta ? meta.label : m[1]}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </div>
  )
}
const DRAFT_KEY = 'cobranza_draft_v1'

const fmtMoney = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n) || 0)

function saveDraft(result, groups) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ result, groups })) } catch {}
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch {}
}
function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') } catch { return null }
}

export default function CobranzaPage() {
  const navigate = useNavigate()
  const draft = loadDraft()
  const [stage, setStage] = useState(draft ? 'preview' : 'upload')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(draft?.result || null)
  const [groups, setGroups] = useState(draft?.groups || [])
  const [createdResult, setCreatedResult] = useState(null)
  const fileRef = useRef(null)

  // Persist edits to draft whenever groups change
  useEffect(() => {
    if (stage === 'preview' && result) saveDraft(result, groups)
  }, [groups, stage, result])

  const handleFile = async (file) => {
    if (!file) return
    setError(null); setStage('analyzing')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await cobranzaAPI.analyze(fd)
      const newGroups = (res.data.groups || []).map((g) => ({
        ...g,
        include: true,
        name: `${g.label} — ${new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`,
        expanded: false
      }))
      setResult(res.data)
      setGroups(newGroups)
      saveDraft(res.data, newGroups)
      setStage('preview')
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo analizar el reporte')
      setStage('upload')
    }
  }

  const handleNewFile = () => {
    clearDraft()
    setResult(null); setGroups([]); setCreatedResult(null); setError(null)
    setStage('upload')
  }

  const patchGroup = (color, patch) =>
    setGroups((gs) => gs.map((g) => (g.color === color ? { ...g, ...patch } : g)))

  const includedCount = groups.filter((g) => g.include).length

  const handleCommit = async () => {
    setStage('committing'); setError(null)
    try {
      const payload = groups
        .filter((g) => g.include)
        .map((g) => ({
          color: g.color,
          name: g.name,
          concept: g.concept,
          message: g.message,
          items: g.familias
            .filter((f) => f.matched && f.recipients.length > 0)
            .flatMap((f) => f.recipients.map((r) => ({ contact_id: r.contact_id, monto: f.monto })))
        }))
      const res = await cobranzaAPI.commit(payload)
      clearDraft()
      setCreatedResult(res.data)
      setStage('done')
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron crear las campañas')
      setStage('preview')
    }
  }

  const m = result?.mapping
  const s = result?.summary

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-md-primary-container flex items-center justify-center">
          <CircleDollarSign size={22} className="text-md-on-primary-container" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-md-on-surface">Cobranza por color</h1>
          <p className="text-sm text-md-on-surface-variant">
            Sube tu reporte de cuentas por cobrar; la IA lo agrupa por color del semáforo y arma campañas en borrador.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
          <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* UPLOAD */}
      {stage === 'upload' && (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-md-outline-variant rounded-2xl p-12 text-center cursor-pointer hover:border-md-primary hover:bg-md-primary-container/10 transition-colors"
        >
          <FileSpreadsheet size={40} className="text-md-on-surface-variant mx-auto mb-3" />
          <p className="text-sm font-medium text-md-on-surface">Arrastra o haz clic para subir tu reporte (.xlsx)</p>
          <p className="text-xs text-md-on-surface-variant mt-1">
            Detectamos el color de cada fila: 🟢 al corriente · 🟠 por vencer · 🔴 vencido · ⚪ reinscripción
          </p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      )}

      {/* ANALYZING */}
      {stage === 'analyzing' && (
        <div className="py-16 text-center">
          <Loader2 size={32} className="text-md-primary animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-md-on-surface">La IA está leyendo tu archivo…</p>
          <p className="text-xs text-md-on-surface-variant mt-1">Detectando columnas y agrupando familias por color (~10-20 seg)</p>
        </div>
      )}

      {/* PREVIEW */}
      {stage === 'preview' && result && (
        <div className="space-y-4">
          {/* Lo que entendió la IA */}
          <div className="p-3 bg-md-primary-container/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-md-primary" />
              <span className="text-sm font-medium text-md-on-surface">Esto entendió la IA</span>
              <span className="ml-auto text-xs px-2 py-0.5 bg-md-primary-container text-md-on-primary-container rounded-full">
                {Math.round((m?.confidence || 0) * 100)}% confianza
              </span>
            </div>
            <p className="text-xs text-md-on-surface-variant leading-relaxed">{m?.notes}</p>
          </div>

          {/* Resumen global */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Filas', value: s?.total_filas },
              { label: 'Familias resueltas', value: s?.familias_resueltas },
              { label: 'Sin match', value: s?.sin_match },
              { label: 'Suma total', value: fmtMoney(s?.suma_total) }
            ].map((x) => (
              <div key={x.label} className="bg-md-surface-container-low rounded-xl p-3 text-center">
                <div className="text-lg font-semibold text-md-on-surface">{x.value ?? 0}</div>
                <div className="text-[11px] text-md-on-surface-variant">{x.label}</div>
              </div>
            ))}
          </div>

          {/* Grupos por color */}
          {groups.map((g) => (
            <ColorGroupCard key={g.color} g={g} onPatch={patchGroup} />
          ))}

          {/* Acciones */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleNewFile}
              className="flex items-center gap-1.5 text-xs text-md-on-surface-variant hover:text-md-on-surface transition-colors"
            >
              <RotateCcw size={13} /> Subir nuevo archivo
            </button>
            <div className="flex items-center gap-3">
              <p className="text-xs text-md-on-surface-variant">
                <strong>{includedCount}</strong> campaña(s) en borrador
              </p>
              <button
                onClick={handleCommit}
                disabled={includedCount === 0}
                className="px-5 py-2.5 rounded-full bg-md-primary text-md-on-primary text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Crear {includedCount} campaña(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMITTING */}
      {stage === 'committing' && (
        <div className="py-16 text-center">
          <Loader2 size={32} className="text-md-primary animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-md-on-surface">Creando campañas en borrador…</p>
        </div>
      )}

      {/* DONE */}
      {stage === 'done' && createdResult && (
        <div className="text-center py-10">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-md-on-surface mb-1">
            {createdResult.created?.length || 0} campaña(s) creada(s) en borrador
          </h2>
          <p className="text-sm text-md-on-surface-variant mb-5">
            Revísalas, ajusta el mensaje si quieres, y envíalas desde Campañas.
          </p>
          <div className="max-w-sm mx-auto space-y-2 mb-6 text-left">
            {createdResult.created?.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-md-surface-container-low rounded-xl px-4 py-2.5">
                <span className="text-sm text-md-on-surface">{c.name}</span>
                <span className="text-xs text-md-on-surface-variant">{c.destinatarios} destinatarios</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleNewFile}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-md-outline-variant text-sm text-md-on-surface-variant hover:bg-md-surface-container transition-colors"
            >
              <RotateCcw size={14} /> Nuevo archivo
            </button>
            <button
              onClick={() => navigate('/campaigns')}
              className="px-5 py-2.5 rounded-full bg-md-primary text-md-on-primary text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Ir a Campañas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ColorGroupCard({ g, onPatch }) {
  const [editingMsg, setEditingMsg] = useState(false)
  const appendVar = (v) => onPatch(g.color, { message: `${g.message} ${v}` })

  return (
    <div className={`rounded-2xl border ${g.include ? 'border-md-primary/40 bg-white' : 'border-md-outline-variant bg-md-surface-container-low/40'}`}>
      {/* Encabezado del grupo */}
      <div className="flex items-center gap-3 p-4">
        <span className="text-2xl">{g.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-md-on-surface">{g.label}</span>
            <span className="text-xs px-2 py-0.5 bg-md-surface-container rounded-full text-md-on-surface-variant">
              {g.count_familias_resueltas} familias · {g.count_destinatarios} destinatarios
            </span>
          </div>
          <p className="text-xs text-md-on-surface-variant mt-0.5">
            Suma: <strong>{fmtMoney(g.suma_monto)}</strong>
            {g.count_sin_match > 0 && (
              <span className="text-amber-600 ml-2">· {g.count_sin_match} sin match</span>
            )}
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-md-on-surface-variant">Crear campaña</span>
          <input
            type="checkbox"
            checked={g.include}
            onChange={(e) => onPatch(g.color, { include: e.target.checked })}
            className="w-4 h-4 accent-md-primary"
          />
        </label>
      </div>

      {/* Editor de la campaña (si está incluida) */}
      {g.include && (
        <div className="px-4 pb-4 space-y-3 border-t border-md-outline-variant pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-md-on-surface-variant uppercase tracking-wide">Nombre de campaña</label>
              <input
                value={g.name}
                onChange={(e) => onPatch(g.color, { name: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-md-outline-variant bg-white focus:border-md-primary outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-md-on-surface-variant uppercase tracking-wide">Concepto</label>
              <input
                value={g.concept}
                onChange={(e) => onPatch(g.color, { concept: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm rounded-xl border border-md-outline-variant bg-white focus:border-md-primary outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-md-on-surface-variant uppercase tracking-wide">Mensaje</label>
              <button
                type="button"
                onClick={() => setEditingMsg((v) => !v)}
                className="text-[11px] text-md-primary underline"
              >
                {editingMsg ? 'Ver preview' : 'Editar texto'}
              </button>
            </div>

            {editingMsg ? (
              <>
                <textarea
                  value={g.message}
                  onChange={(e) => onPatch(g.color, { message: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-md-outline-variant bg-white focus:border-md-primary outline-none resize-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {VARIABLES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => appendVar(v)}
                      className="text-[11px] px-1.5 py-0.5 bg-md-primary-container/40 text-md-on-primary-container rounded hover:bg-md-primary-container/70"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div
                onClick={() => setEditingMsg(true)}
                className="w-full px-3 py-2.5 rounded-xl border border-md-outline-variant bg-md-surface-container-low/50 cursor-text min-h-[72px]"
              >
                <MessageBubble text={g.message} />
              </div>
            )}
          </div>

          <FamiliesPreview g={g} onPatch={onPatch} />
        </div>
      )}
    </div>
  )
}

function FamiliesPreview({ g, onPatch }) {
  const resueltas = useMemo(
    () => g.familias.filter((f) => f.matched && f.recipients.length > 0),
    [g.familias]
  )
  const sinMatch = useMemo(
    () => g.familias.filter((f) => !f.matched || f.recipients.length === 0),
    [g.familias]
  )

  return (
    <div>
      <button
        type="button"
        onClick={() => onPatch(g.color, { expanded: !g.expanded })}
        className="flex items-center gap-1 text-xs font-medium text-md-primary"
      >
        {g.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Users size={13} /> Ver familias que recibirán este mensaje ({resueltas.length})
      </button>

      {g.expanded && (
        <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
          {resueltas.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-md-surface-container-low rounded-lg px-3 py-1.5">
              <span className="text-md-on-surface truncate">
                {f.nombre_familia || f.alumno}
                <span className="text-md-on-surface-variant"> · {f.recipients.length} 📱</span>
              </span>
              <span className="text-md-on-surface-variant flex-shrink-0">{fmtMoney(f.monto)}</span>
            </div>
          ))}
          {sinMatch.length > 0 && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg mt-2">
              <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-700">
                <strong>{sinMatch.length}</strong> sin match (no se cargan): {sinMatch.slice(0, 5).map((f) => f.alumno).join(', ')}
                {sinMatch.length > 5 ? '…' : ''}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
