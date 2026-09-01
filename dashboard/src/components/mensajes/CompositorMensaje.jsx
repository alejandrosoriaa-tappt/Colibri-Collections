import { useState, useEffect, useRef } from 'react'
import {
  X, Loader2, AlertCircle, Users, Send, FileText, Eye,
  ChevronDown, Check, Search, Radio, Paperclip
} from 'lucide-react'
import { broadcastsAPI, contactsAPI } from '../../lib/api.js'
import useAuthStore from '../../store/authStore.js'

// A quién va dirigido el envío. Mensajes permite grupo o familia/alumno;
// Comunicados permite toda la comunidad o grupo.
const DESTINOS = {
  todos:      { label: 'Toda la comunidad' },
  grupos:     { label: 'Por grupo' },
  individual: { label: 'Por familia o alumno' },
}

const VARIABLES_HELP = [
  { var: '{nombre}', desc: 'Nombre del contacto' },
  { var: '{grupo}',  desc: 'Grupo del contacto' },
]

/**
 * Agrupa los salones por la sección REAL de cada colegio.
 *
 * Antes la lista de secciones estaba escrita a mano —Preescolar, Primaria,
 * Secundaria, Preparatoria— y todo lo demás caía en "Otros grupos". En un
 * Montessori eso significaba que CNA, CNB y los Talleres, o sea el colegio
 * entero, aparecían como "otros". La directora no reconocía su propia escuela.
 *
 * Ahora la sección viene con cada grupo desde la base.
 */
function organizeGroups(groups) {
  const buckets = new Map()
  for (const g of groups) {
    const key = g.seccion || 'Otros grupos'
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(g)
  }

  const porNombre = (a, b) => a.grupo.localeCompare(b.grupo, 'es', { numeric: true })

  return [...buckets.entries()]
    // "Otros grupos" hasta abajo: es el cajón de lo que no tiene sección.
    .sort(([a], [b]) => {
      if (a === 'Otros grupos') return 1
      if (b === 'Otros grupos') return -1
      return a.localeCompare(b, 'es')
    })
    .map(([name, gs]) => ({ name, groups: gs.sort(porNombre) }))
}

const EMPTY_FORM = { title: '', message: '', group_filters: [], contactos: [], media_url: '' }

/**
 * Compositor de envíos. Se abre como modal SOBRE la pantalla que lo invoca,
 * para no mandar al usuario a otra vista con otra lista y otro diseño.
 *
 * modo: 'grupos'  → Mensajes    (por grupo | por familia o alumno)
 *       'general' → Comunicados (toda la comunidad | por grupo)
 */
export default function CompositorMensaje({ modo = 'grupos', gruposIniciales = [], borrador = null, tipo = null, onClose, onSent }) {
  const { tenant } = useAuthStore()
  const esGeneral = modo === 'general'
  const copy = esGeneral
    ? { titulo: 'Nuevo comunicado', label: 'comunicado', sub: 'Se enviará por WhatsApp a toda la comunidad' }
    : { titulo: 'Nuevo mensaje',    label: 'mensaje',    sub: 'Se enviará por WhatsApp a los salones que elijas' }

  const destinosDisponibles = esGeneral ? ['todos', 'grupos'] : ['grupos', 'individual']

  const [destino, setDestino] = useState(destinosDisponibles[0])
  // `borrador` precarga título y texto (p. ej. el aviso de inicio de ciclo).
  // Se deja editable a propósito: cada colegio querrá cambiarle algo, y un
  // texto que no se puede tocar termina en que lo escriben aparte.
  const [form, setForm] = useState({ ...EMPTY_FORM, ...(borrador || {}), group_filters: gruposIniciales })
  const [groups, setGroups] = useState([])
  const [groupsOpen, setGroupsOpen] = useState(false)
  const groupsRef = useRef(null)

  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState(null)

  const [previewCount, setPreviewCount] = useState(null)
  const [previewContacts, setPreviewContacts] = useState([])
  const [showRecipients, setShowRecipients] = useState(false)
  const [showVars, setShowVars] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [formError, setFormError] = useState(null)

  // Archivo adjunto. Se sube a Supabase Storage y se manda su URL pública:
  // WhatsApp descarga el archivo desde ahí, y un enlace de Drive no sirve
  // porque devuelve HTML en vez del PDF.
  const archivoRef = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  // WhatsApp permite UN adjunto por mensaje, así que varios archivos significan
  // varios mensajes seguidos. El primero lleva el texto del comunicado.
  const MAX_ARCHIVOS = 5
  const [archivos, setArchivos] = useState([])   // [{ url, type, filename }]
  const archivo = archivos[0] || null

  const subirArchivos = async (lista) => {
    const nuevos = Array.from(lista || [])
    if (!nuevos.length) return

    const cupo = MAX_ARCHIVOS - archivos.length
    if (cupo <= 0) {
      setFormError(`Máximo ${MAX_ARCHIVOS} archivos por comunicado`)
      return
    }

    setSubiendo(true)
    setFormError(null)
    try {
      const subidos = []
      // De uno en uno: si el tercero falla, los dos primeros ya están arriba y
      // no se pierde el trabajo de volver a elegirlos.
      for (const file of nuevos.slice(0, cupo)) {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await broadcastsAPI.uploadMedia(fd)
        subidos.push(data)
      }
      setArchivos(prev => {
        const todos = [...prev, ...subidos]
        setForm(f => ({ ...f, media_url: todos[0]?.url || '' }))
        return todos
      })
    } catch (err) {
      setFormError(err.response?.data?.error || 'No se pudo subir el archivo')
    } finally {
      setSubiendo(false)
      if (archivoRef.current) archivoRef.current.value = ''
    }
  }

  const quitarArchivo = (idx = 0) => {
    setArchivos(prev => {
      const quedan = prev.filter((_, i) => i !== idx)
      setForm(f => ({ ...f, media_url: quedan[0]?.url || '' }))
      return quedan
    })
    if (archivoRef.current) archivoRef.current.value = ''
  }

  useEffect(() => {
    broadcastsAPI.groups()
      .then(res => setGroups(res.data.groups || []))
      .catch(() => setGroups([]))
  }, [])

  // Cerrar el desplegable de grupos al hacer click fuera
  useEffect(() => {
    const onClick = (e) => {
      if (groupsRef.current && !groupsRef.current.contains(e.target)) setGroupsOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Busca familias por apellido, alumno o nombre (con debounce)
  useEffect(() => {
    if (destino !== 'individual') return
    const q = busqueda.trim()
    if (q.length < 2) { setResultados([]); setErrorBusqueda(null); return }
    setBuscando(true)
    setErrorBusqueda(null)
    const t = setTimeout(() => {
      contactsAPI.getFamilies(q)
        .then(res => setResultados(res.data.families || []))
        .catch((err) => {
          // Un fallo de la búsqueda NO puede verse igual que "no hay resultados"
          console.error('Error buscando familias:', err)
          setResultados([])
          setErrorBusqueda(err.response?.data?.error || 'No se pudo buscar. Intenta de nuevo.')
        })
        .finally(() => setBuscando(false))
    }, 300)
    return () => clearTimeout(t)
  }, [busqueda, destino])

  // Cuántos contactos recibirán el envío
  useEffect(() => {
    setPreviewCount(null)
    setPreviewContacts([])
    setShowRecipients(false)

    if (destino === 'individual') {
      setPreviewCount(form.contactos.length)
      setPreviewContacts(form.contactos.map(c => ({ id: c.id, nombre: c.label, grupo: c.familia })))
      return
    }
    const groupParam = destino === 'grupos' && form.group_filters.length > 0
      ? form.group_filters.join(',')
      : undefined
    broadcastsAPI.preview(groupParam)
      .then(res => {
        setPreviewCount(res.data.count)
        setPreviewContacts(res.data.contacts || [])
      })
      .catch(() => setPreviewCount(null))
  }, [form.group_filters, form.contactos, destino])

  const toggleGroup = (g) => {
    setForm(f => ({
      ...f,
      group_filters: f.group_filters.includes(g)
        ? f.group_filters.filter(x => x !== g)
        : [...f.group_filters, g]
    }))
  }

  // Agrega a los papás de una familia: son quienes tienen teléfono y por tanto
  // los que realmente reciben el WhatsApp.
  const agregarFamilia = (fam) => {
    const conTelefono = (fam.papas || []).filter(p => p.telefono)
    if (conTelefono.length === 0) return
    setForm(f => {
      const yaIds = new Set(f.contactos.map(c => c.id))
      const nuevos = conTelefono
        .filter(p => !yaIds.has(p.id))
        .map(p => ({ id: p.id, label: `${p.nombre} ${p.apellido || ''}`.trim(), familia: fam.nombre_familia }))
      return { ...f, contactos: [...f.contactos, ...nuevos] }
    })
    setBusqueda('')
    setResultados([])
  }

  const quitarContacto = (id) =>
    setForm(f => ({ ...f, contactos: f.contactos.filter(c => c.id !== id) }))

  const handleSend = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.message.trim()) return

    // El destinatario es obligatorio salvo cuando es explícitamente "todos":
    // sin esto un envío sin selección se iría en silencio a TODA la comunidad.
    if (destino === 'grupos' && form.group_filters.length === 0) {
      setFormError('Elige al menos un salón o grupo.')
      return
    }
    if (destino === 'individual' && form.contactos.length === 0) {
      setFormError('Busca y elige al menos una familia o alumno.')
      return
    }

    setFormError(null)
    setIsSending(true)
    try {
      await broadcastsAPI.send({
        title: form.title.trim(),
        message: form.message.trim(),
        group_filters: destino === 'grupos' ? form.group_filters : null,
        contact_ids: destino === 'individual' ? form.contactos.map(c => c.id) : null,
        group_filter: destino === 'individual'
          ? [...new Set(form.contactos.map(c => c.familia).filter(Boolean))].join(', ')
          : undefined,
        media_url: form.media_url.trim() || null,
        // El tipo real importa: decide si va como imagen, como adjunto o como
        // link en el texto. Antes iba 'document' fijo y las imágenes nunca se
        // mandaban como tales.
        media_type: archivo?.type || (form.media_url ? 'application/octet-stream' : null),
        media_filename: archivo?.filename || (form.media_url ? form.media_url.split('/').pop() : null),
        // Del segundo en adelante: cada uno viaja como su propio mensaje.
        adjuntos: archivos.slice(1),
        // 'bienvenida' usa su propia plantilla, con el texto cerrado y aprobado
        // en Meta. Si aún no está aprobada, el backend cae al comunicado normal.
        tipo
      })
      onSent?.(`${esGeneral ? 'Comunicado' : 'Mensaje'} "${form.title.trim()}" enviado correctamente`)
    } catch (err) {
      setFormError(err.response?.data?.error || err.message)
      setIsSending(false)
    }
  }

  const insertVar = (v) => setForm(f => ({ ...f, message: f.message + v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-md-outline-variant flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-md-on-surface">{copy.titulo}</h2>
            <p className="text-xs text-md-on-surface-variant mt-0.5">{copy.sub}</p>
          </div>
          <button onClick={onClose} className="text-md-on-surface-variant hover:text-md-on-surface p-1 rounded-full">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-5 space-y-4 overflow-y-auto flex-1">
          {formError && (
            <div className="flex items-start gap-2 p-3 bg-md-error-container rounded-2xl text-sm text-md-on-error-container">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {formError}
            </div>
          )}

          <div>
            <label className="label">Título del {copy.label} *</label>
            <input
              className="input"
              placeholder="Ej. Aviso de asamblea junio, Circular mantenimiento…"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
            {/* El título NO viaja en el WhatsApp: la plantilla de Meta solo
                lleva colegio y cuerpo. Decirlo evita que se redacte pensando
                que los papás lo van a leer. */}
            <p className="text-xs text-md-on-surface-variant mt-1">
              Solo para identificarlo aquí en Kollybry. No aparece en el WhatsApp que reciben.
            </p>
          </div>

          {/* ── Destinatarios ── */}
          <div>
            <label className="label">Destinatarios</label>

            <div className="flex gap-2 mb-2">
              {destinosDisponibles.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDestino(d)}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    destino === d
                      ? 'bg-md-primary text-white border-md-primary'
                      : 'bg-white text-md-on-surface-variant border-md-outline-variant hover:border-md-primary hover:text-md-primary'
                  }`}
                >
                  {DESTINOS[d].label}
                </button>
              ))}
            </div>

            {destino === 'todos' && (
              <div className="flex items-center gap-2 p-3 bg-md-primary-container/40 rounded-2xl">
                <Radio size={15} className="text-md-primary flex-shrink-0" />
                <p className="text-sm text-md-on-surface">Se enviará a toda la comunidad</p>
              </div>
            )}

            {/* Búsqueda de familia o alumno */}
            {destino === 'individual' && (
              <div>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant" />
                  <input
                    className="input pl-9"
                    placeholder="Busca por apellido de familia o nombre del alumno…"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />
                  {buscando && (
                    <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant animate-spin" />
                  )}
                </div>

                {resultados.length > 0 && (
                  <div className="mt-1 border border-md-outline-variant rounded-2xl max-h-56 overflow-y-auto divide-y divide-md-outline-variant">
                    {resultados.map(fam => {
                      const conTel = (fam.papas || []).filter(p => p.telefono)
                      const alumnos = (fam.estudiantes || [])
                        .map(a => a.nombre_alumno || `${a.nombre} ${a.apellido || ''}`.trim())
                        .filter(Boolean)
                      return (
                        <button
                          key={fam.nombre_familia}
                          type="button"
                          disabled={conTel.length === 0}
                          onClick={() => agregarFamilia(fam)}
                          className="w-full text-left px-3 py-2 hover:bg-md-surface-container disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <p className="text-sm font-medium text-md-on-surface">Familia {fam.nombre_familia}</p>
                          {alumnos.length > 0 && (
                            <p className="text-xs text-md-on-surface-variant truncate">{alumnos.join(' · ')}</p>
                          )}
                          <p className="text-xs text-md-on-surface-variant/70">
                            {conTel.length > 0
                              ? `${conTel.length} ${conTel.length === 1 ? 'contacto' : 'contactos'} con WhatsApp`
                              : 'Sin teléfono registrado'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}

                {errorBusqueda && (
                  <p className="text-xs text-md-error mt-1.5">{errorBusqueda}</p>
                )}

                {!errorBusqueda && busqueda.trim().length >= 2 && !buscando && resultados.length === 0 && (
                  <p className="text-xs text-md-on-surface-variant mt-1.5">Sin resultados para "{busqueda.trim()}"</p>
                )}

                {form.contactos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.contactos.map(c => (
                      <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-md-primary-container text-md-on-primary-container rounded-lg text-xs font-medium">
                        {c.label}
                        <button type="button" onClick={() => quitarContacto(c.id)} className="hover:text-md-error">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selector de grupos */}
            {destino === 'grupos' && (
              <div className="relative" ref={groupsRef}>
                <button
                  type="button"
                  onClick={() => setGroupsOpen(o => !o)}
                  className="input flex items-center justify-between text-left w-full"
                >
                  <span className={form.group_filters.length === 0 ? 'text-md-on-surface-variant' : 'text-md-on-surface'}>
                    {form.group_filters.length === 0
                      ? 'Elige uno o varios grupos'
                      : form.group_filters.length === 1
                      ? form.group_filters[0]
                      : `${form.group_filters.length} grupos seleccionados`}
                  </span>
                  <ChevronDown size={16} className={`text-md-on-surface-variant flex-shrink-0 transition-transform ${groupsOpen ? 'rotate-180' : ''}`} />
                </button>

                {groupsOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-md-outline-variant rounded-2xl shadow-md3-2 max-h-72 overflow-y-auto py-1">
                    {organizeGroups(groups).map(sec => {
                      // Los nombres son lo que viaja al backend; el objeto trae
                      // además sección y conteo para pintarlos.
                      const nombres = sec.groups.map(g => g.grupo)
                      const allSelected = nombres.every(n => form.group_filters.includes(n))
                      return (
                        <div key={sec.name}>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({
                              ...f,
                              group_filters: allSelected
                                ? f.group_filters.filter(n => !nombres.includes(n))
                                : [...new Set([...f.group_filters, ...nombres])]
                            }))}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-md-on-surface-variant uppercase tracking-wide hover:bg-md-surface-container"
                          >
                            {sec.name}
                            <span className="text-[10px] normal-case font-medium text-md-primary">
                              {allSelected ? 'Quitar todos' : 'Todos'}
                            </span>
                          </button>
                          {sec.groups.map(g => {
                            const sel = form.group_filters.includes(g.grupo)
                            return (
                              <button
                                key={g.grupo}
                                type="button"
                                onClick={() => toggleGroup(g.grupo)}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-md-surface-container"
                              >
                                <span className={sel ? 'text-md-primary font-medium' : 'text-md-on-surface'}>
                                  {g.grupo}
                                  {/* El conteo delata los grupos fantasma: uno con
                                      1 contacto que nadie reconoce es un registro
                                      mal capturado. */}
                                  <span className="ml-1.5 text-xs text-md-on-surface-variant">({g.contactos})</span>
                                </span>
                                {sel && <Check size={15} className="text-md-primary" />}
                              </button>
                            )
                          })}
                        </div>
                      )
                    })}
                    {groups.length === 0 && (
                      <p className="px-3 py-2 text-sm text-md-on-surface-variant">No hay grupos todavía</p>
                    )}
                  </div>
                )}

                {form.group_filters.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.group_filters.map(g => (
                      <span key={g} className="inline-flex items-center gap-1 px-2 py-0.5 bg-md-primary-container text-md-on-primary-container rounded-lg text-xs font-medium">
                        {g}
                        <button type="button" onClick={() => toggleGroup(g)} className="hover:text-md-error">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cuántos lo recibirán */}
            {previewCount !== null && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowRecipients(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-md-primary font-medium hover:underline"
                >
                  <Eye size={13} />
                  {previewCount} contacto{previewCount !== 1 ? 's' : ''} recibirán este mensaje
                  <ChevronDown size={12} className={`transition-transform ${showRecipients ? 'rotate-180' : ''}`} />
                </button>

                {showRecipients && previewContacts.length > 0 && (
                  <div className="mt-2 border border-md-outline-variant rounded-2xl bg-md-surface-container-low max-h-44 overflow-y-auto divide-y divide-md-outline-variant">
                    {previewContacts.map(c => (
                      <div key={c.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-md-on-surface font-medium truncate">{c.nombre} {c.apellido || ''}</span>
                        <span className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {c.grupo && <span className="px-1.5 py-0.5 bg-md-primary-container text-md-on-primary-container rounded text-[10px]">{c.grupo}</span>}
                          {c.telefono && <span className="font-mono text-md-on-surface-variant">{c.telefono}</span>}
                        </span>
                      </div>
                    ))}
                    {previewCount > previewContacts.length && (
                      <div className="px-3 py-1.5 text-[11px] text-md-on-surface-variant text-center">
                        … y {previewCount - previewContacts.length} más
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Mensaje ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Mensaje *</label>
              <button
                type="button"
                onClick={() => setShowVars(!showVars)}
                className="text-xs text-md-primary hover:underline"
              >
                {showVars ? 'Ocultar variables' : '+ Insertar variable'}
              </button>
            </div>

            {showVars && (
              <div className="mb-2 space-y-2">
                <p className="text-xs text-md-on-surface-variant leading-relaxed">
                  Las <strong>variables</strong> son datos que Kollybry reemplaza automáticamente por la información
                  de cada contacto al enviar. Si escribes <code className="bg-md-surface-container px-1 rounded">{'{nombre}'}</code>,
                  cada papá recibirá el mensaje con su nombre real.
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
              <p className="text-xs text-md-on-surface-variant">{form.message.length} caracteres</p>
              <div className="flex gap-1.5">
                {['{nombre}', '{apellido}', '{nombre_completo}'].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVar(v)}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-md-primary-container text-md-on-primary-container hover:bg-md-primary hover:text-white transition-colors font-mono"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Adjunto opcional ── */}
          <div>
            <label className="label">Archivos adjuntos (opcional)</label>

            <input
              ref={archivoRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={e => subirArchivos(e.target.files)}
            />

            {archivos.length > 0 && (
              <div className="space-y-2 mb-2">
                {archivos.map((a, i) => (
                  <div key={a.url} className="flex items-center gap-2 p-3 bg-md-surface-container rounded-2xl">
                    <FileText size={16} className="text-md-primary flex-shrink-0" />
                    <span className="text-sm text-md-on-surface truncate flex-1">{a.filename}</span>
                    {i === 0 && archivos.length > 1 && (
                      <span className="text-[10px] text-md-on-surface-variant flex-shrink-0">va con el texto</span>
                    )}
                    <button type="button" onClick={() => quitarArchivo(i)}
                      className="text-md-on-surface-variant hover:text-md-error">
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {archivos.length < MAX_ARCHIVOS && (
              <button
                type="button"
                onClick={() => archivoRef.current?.click()}
                disabled={subiendo}
                className="w-full border-2 border-dashed border-md-outline-variant rounded-2xl p-4 text-center hover:border-md-primary hover:bg-md-surface-container transition-colors disabled:opacity-60"
              >
                {subiendo ? (
                  <span className="flex items-center justify-center gap-2 text-sm text-md-on-surface-variant">
                    <Loader2 size={15} className="animate-spin" /> Subiendo…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 text-sm text-md-on-surface-variant">
                    <Paperclip size={15} />
                    {archivos.length ? 'Agregar otro archivo' : 'Elegir PDF o imagen'}
                  </span>
                )}
              </button>
            )}

            <p className="text-xs text-md-on-surface-variant mt-1">
              El archivo se sube a Kollybry y se envía por WhatsApp. No uses enlaces de
              Google Drive: WhatsApp no puede leerlos.
            </p>

            {/* WhatsApp no permite dos adjuntos en un mensaje, así que cada
                archivo extra es un mensaje más — y se cobra aparte. Decirlo aquí
                evita la sorpresa en la factura. */}
            {archivos.length > 1 && (
              <p className="text-xs text-amber-700 mt-1">
                Con {archivos.length} archivos, a cada familia le llegan {archivos.length} mensajes
                seguidos: WhatsApp solo permite un adjunto por mensaje. El costo se multiplica igual.
              </p>
            )}
          </div>

          {/* ── Vista previa ── */}
          {(form.message || form.media_url) && (
            <div className="bg-md-surface-container-low rounded-2xl p-4">
              <p className="text-xs text-md-on-surface-variant uppercase tracking-wide font-medium mb-2">Vista previa</p>
              <div className="bg-white rounded-2xl p-3 shadow-md3-1 max-w-xs">
                <p className="text-sm text-md-on-surface whitespace-pre-wrap">
                  {form.message
                    .replace(/{nombre}/g, 'Roberto')
                    .replace(/{grupo}/g, form.group_filters[0] || 'Grupo A')}
                </p>
                {form.media_url && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-md-primary-container/40 rounded-xl">
                    <FileText size={14} className="text-md-primary" />
                    <span className="text-xs text-md-primary truncate">{form.media_url.split('/').pop() || 'Documento'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn-tonal text-sm" disabled={isSending}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex-1 btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {isSending ? 'Enviando…' : 'Enviar ahora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
