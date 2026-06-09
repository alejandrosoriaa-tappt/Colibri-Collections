import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Users, Loader2, ChevronLeft, ChevronRight, UserPlus,
  X, CheckCircle2, AlertCircle, UserMinus, UserCheck, Trash2,
  RefreshCw, Upload, AlertTriangle, Info, Mail, Download
} from 'lucide-react'
import { contactsAPI, uploadAPI } from '../lib/api.js'
import useAuthStore from '../store/authStore.js'
import { getOrgConfig } from '../config/orgTypeConfig.js'

// ── Sección escolar options ────────────────────────────────────────────────────
const SECCIONES = ['Preescolar', 'Primaria', 'Secundaria', 'Preparatoria / Bachillerato', 'Universidad']
const GRADOS = {
  'Preescolar':              ['1ro', '2do', '3ro'],
  'Primaria':                ['1ro', '2do', '3ro', '4to', '5to', '6to'],
  'Secundaria':              ['1ro', '2do', '3ro'],
  'Preparatoria / Bachillerato': ['1ro', '2do', '3ro'],
  'Universidad':             ['1ro', '2do', '3ro', '4to', '5to', '6to', '7mo', '8vo', '9no'],
}

const PAGE_SIZE = 50

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

function daysSince(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// ── Add Contact Modal (dinámico según org_type) ───────────────────────────────
function AddContactModal({ onClose, onSaved, orgType = 'general' }) {
  const orgConfig    = getOrgConfig(orgType)
  const normalizedOrgType = orgType?.toLowerCase?.().replace(/\s*\/\s*/g, '') || ''
  const isColegio    = normalizedOrgType.includes('colegio') || normalizedOrgType.includes('academia') || normalizedOrgType.includes('escuela')
  const isCondominio = normalizedOrgType.includes('condominio')
  const isClub       = normalizedOrgType.includes('club') || normalizedOrgType.includes('gimnasio')

  // Para colegios: estructura de familia
  const [familyForm, setFamilyForm] = useState({
    nombre_familia: '',
    nombre_mama: '',
    telefono_mama: '',
    nombre_papa: '',
    telefono_papa: '',
    estudiantes: [{ nombre: '', apellidos: '', seccion: '', salon: '' }],
    email: '',
  })

  const [form, setForm] = useState({
    nombre: '', apellido: '', telefono: '', email: '',
    grupo: '', payment_link: '',
    // Colegio / Academia (legacy)
    seccion: '', grado: '', salon: '', nombre_alumno: '',
    // Condominio
    fraccionamiento: '', torre: '', num_interior: '',
    // Club / Gym
    id_externo: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setFamily = k => e => setFamilyForm(f => ({ ...f, [k]: e.target.value }))

  const gradosDisponibles = GRADOS[form.seccion] || []

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      // ─────── COLEGIO: FAMILIA ─────────
      if (isColegio) {
        const { nombre_familia, nombre_mama, telefono_mama, nombre_papa, telefono_papa, estudiantes, email } = familyForm

        if (!nombre_familia.trim()) throw new Error('Nombre de familia es requerido')
        if (!email.trim()) throw new Error('Correo electrónico es requerido')
        if (nombre_mama.trim() && !telefono_mama.trim()) throw new Error('WhatsApp de Mamá es requerido')
        if (nombre_papa.trim() && !telefono_papa.trim()) throw new Error('WhatsApp de Papá es requerido')

        const estudiantesValidos = estudiantes.filter(e => e.nombre.trim())
        if (estudiantesValidos.length === 0) throw new Error('Al menos un alumno es requerido')

        // Crear alumnos primero
        const studentIds = []
        for (const alumno of estudiantesValidos) {
          const nombreCompleto = `${alumno.nombre.trim()} ${alumno.apellidos.trim()}`.trim()
          const studentRes = await contactsAPI.create({
            nombre: alumno.nombre.trim(),
            apellido: alumno.apellidos.trim() || undefined,
            telefono: '',
            email: '',
            nombre_familia: nombre_familia.trim(),
            relationship_type: 'student',
            nombre_alumno: nombreCompleto,
            seccion: alumno.seccion || undefined,
            grado: alumno.grado || undefined,
            salon: alumno.salon || undefined,
            org_type: orgType
          })
          studentIds.push(studentRes.data.id)
        }

        // Crear mamá
        if (nombre_mama.trim()) {
          const parts = nombre_mama.trim().split(' ')
          const nombre = parts[0]
          const apellido = parts.slice(1).join(' ')
          await contactsAPI.create({
            nombre: nombre,
            apellido: apellido,
            telefono: telefono_mama.trim(),
            email: email.trim(),
            nombre_familia: nombre_familia.trim(),
            relationship_type: 'mama',
            priority: 1,
            student_id: studentIds[0],
            org_type: orgType
          })
        }

        // Crear papá
        if (nombre_papa.trim()) {
          const parts = nombre_papa.trim().split(' ')
          const nombre = parts[0]
          const apellido = parts.slice(1).join(' ')
          await contactsAPI.create({
            nombre: nombre,
            apellido: apellido,
            telefono: telefono_papa.trim(),
            email: email.trim(),
            nombre_familia: nombre_familia.trim(),
            relationship_type: 'papa',
            priority: 0,
            student_id: studentIds[0],
            org_type: orgType
          })
        }

        onSaved()
        return
      }

      // ─────── OTROS TIPOS: CONTACTO GENÉRICO ─────────
      await contactsAPI.create({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim() || undefined,
        telefono: form.telefono.trim(),
        email: form.email.trim() || undefined,
        payment_link: form.payment_link.trim() || undefined,
        org_type: orgType,
        // Condominio
        ...(isCondominio && {
          fraccionamiento: form.fraccionamiento.trim() || undefined,
          torre: form.torre.trim() || undefined,
          num_interior: form.num_interior.trim() || undefined
        }),
        // Club / Gym
        ...(isClub && {
          grupo: form.grupo.trim() || undefined,
          id_externo: form.id_externo.trim() || undefined,
        }),
        // Generic
        ...(!isColegio && !isCondominio && !isClub && { grupo: form.grupo.trim() || undefined })
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-md-outline-variant flex-shrink-0">
          <h2 className="text-base font-semibold text-md-on-surface flex items-center gap-2">
            <UserPlus size={16} className="text-md-primary" /> Agregar contacto
          </h2>
          <button onClick={onClose} className="text-md-on-surface-variant hover:text-md-on-surface p-1 rounded-full">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-md-error-container rounded-2xl text-sm text-md-on-error-container">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* ── COLEGIO / ACADEMIA — FAMILIA ── */}
          {isColegio && (
            <>
              <div>
                <label className="label">Apellido de Familia <span className="text-md-error">*</span></label>
                <input className="input" value={familyForm.nombre_familia} onChange={setFamily('nombre_familia')}
                  placeholder="Ej. García López" required autoFocus />
                <p className="text-xs text-md-on-surface-variant mt-1.5">Apellido que identifica a la familia</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nombre de Mamá</label>
                  <input className="input" value={familyForm.nombre_mama} onChange={setFamily('nombre_mama')}
                    placeholder="Ej. Rosa López" />
                </div>
                <div>
                  <label className="label">WhatsApp Mamá</label>
                  <input className="input font-mono text-sm" value={familyForm.telefono_mama} onChange={setFamily('telefono_mama')}
                    placeholder="+521XXXXXXXXXX" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nombre de Papá</label>
                  <input className="input" value={familyForm.nombre_papa} onChange={setFamily('nombre_papa')}
                    placeholder="Ej. Juan García" />
                </div>
                <div>
                  <label className="label">WhatsApp Papá</label>
                  <input className="input font-mono text-sm" value={familyForm.telefono_papa} onChange={setFamily('telefono_papa')}
                    placeholder="+521XXXXXXXXXX" />
                </div>
              </div>

              <div>
                <label className="label">Alumnos <span className="text-md-error">*</span></label>
                <div className="space-y-3">
                  {familyForm.estudiantes.map((alumno, idx) => (
                    <div key={idx} className="border border-md-outline-variant rounded-xl p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="input text-sm"
                          value={alumno.nombre}
                          onChange={e => setFamilyForm(f => ({
                            ...f,
                            estudiantes: f.estudiantes.map((a, i) => i === idx ? { ...a, nombre: e.target.value } : a)
                          }))}
                          placeholder="Nombre"
                          required
                        />
                        <input
                          className="input text-sm"
                          value={alumno.apellidos}
                          onChange={e => setFamilyForm(f => ({
                            ...f,
                            estudiantes: f.estudiantes.map((a, i) => i === idx ? { ...a, apellidos: e.target.value } : a)
                          }))}
                          placeholder="Apellidos"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          className="input text-sm"
                          value={alumno.seccion || ''}
                          onChange={e => setFamilyForm(f => ({
                            ...f,
                            estudiantes: f.estudiantes.map((a, i) => i === idx ? { ...a, seccion: e.target.value } : a)
                          }))}
                        >
                          <option value="">Sección</option>
                          {SECCIONES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select
                          className="input text-sm"
                          value={alumno.grado || ''}
                          onChange={e => setFamilyForm(f => ({
                            ...f,
                            estudiantes: f.estudiantes.map((a, i) => i === idx ? { ...a, grado: e.target.value } : a)
                          }))}
                        >
                          <option value="">Grado</option>
                          {(GRADOS[alumno.seccion] || []).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <input
                          className="input text-sm text-center"
                          value={alumno.salon || ''}
                          onChange={e => setFamilyForm(f => ({
                            ...f,
                            estudiantes: f.estudiantes.map((a, i) => i === idx ? { ...a, salon: e.target.value } : a)
                          }))}
                          placeholder="Salón"
                          maxLength={3}
                        />
                      </div>
                      {familyForm.estudiantes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFamilyForm(f => ({
                            ...f,
                            estudiantes: f.estudiantes.filter((_, i) => i !== idx)
                          }))}
                          className="w-full text-sm text-md-error hover:text-md-error-dark font-medium py-1"
                        >
                          Eliminar alumno
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFamilyForm(f => ({ ...f, estudiantes: [...f.estudiantes, { nombre: '', apellidos: '', seccion: '', salon: '' }] }))}
                  className="mt-2 text-sm text-md-primary hover:text-md-primary-dark font-medium flex items-center gap-1"
                >
                  <UserPlus size={14} /> Agregar otro alumno
                </button>
              </div>

              <div className="pt-1 border-t border-md-outline-variant space-y-4">
                <div>
                  <label className="label">Correo Electrónico de Familia <span className="text-md-error">*</span></label>
                  <input className="input" type="email" value={familyForm.email} onChange={setFamily('email')}
                    placeholder="familia@ejemplo.com" required />
                  <p className="text-xs text-md-on-surface-variant mt-1.5">Correo compartido para toda la familia</p>
                </div>
              </div>
            </>
          )}

          {/* ── CONDOMINIO ── */}
          {isCondominio && (
            <>
              <div>
                <label className="label">Nombre del condómino <span className="text-md-error">*</span></label>
                <input className="input" value={form.nombre} onChange={set('nombre')}
                  placeholder="Ej. Juan Pérez García" required autoFocus />
              </div>

              <div>
                <label className="label">Fraccionamiento / Privada</label>
                <input className="input" value={form.fraccionamiento} onChange={set('fraccionamiento')}
                  placeholder="Ej. Coto Las Palmas" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Torre / Edificio</label>
                  <input className="input" value={form.torre} onChange={set('torre')}
                    placeholder="Ej. Torre A" />
                </div>
                <div>
                  <label className="label">Número interior <span className="text-md-error">*</span></label>
                  <input className="input" value={form.num_interior} onChange={set('num_interior')}
                    placeholder="Ej. 203" required />
                </div>
              </div>
            </>
          )}

          {/* ── CLUB / GIMNASIO ── */}
          {isClub && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nombre <span className="text-md-error">*</span></label>
                  <input className="input" value={form.nombre} onChange={set('nombre')}
                    placeholder="María" required autoFocus />
                </div>
                <div>
                  <label className="label">Apellido</label>
                  <input className="input" value={form.apellido} onChange={set('apellido')}
                    placeholder="González" />
                </div>
              </div>
              <div>
                <label className="label">{orgConfig.groupLabel}</label>
                <input className="input" value={form.grupo} onChange={set('grupo')}
                  placeholder="Ej. Membresía Oro, Socio Activo, Gold" />
              </div>
              <div>
                <label className="label">{orgConfig.idExternoLabel} <span className="text-md-on-surface-variant font-normal">(opcional)</span></label>
                <input className="input font-mono" value={form.id_externo} onChange={set('id_externo')}
                  placeholder="Ej. GYM001, SOC-123" />
              </div>
            </>
          )}

          {/* ── GENERAL ── */}
          {!isColegio && !isCondominio && !isClub && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nombre <span className="text-md-error">*</span></label>
                  <input className="input" value={form.nombre} onChange={set('nombre')}
                    placeholder="María" required autoFocus />
                </div>
                <div>
                  <label className="label">Apellido</label>
                  <input className="input" value={form.apellido} onChange={set('apellido')}
                    placeholder="González" />
                </div>
              </div>
              <div>
                <label className="label">Grupo / Segmento</label>
                <input className="input" value={form.grupo} onChange={set('grupo')}
                  placeholder="Ej. Grupo A, Norte" />
              </div>
            </>
          )}

          {/* ── Campos comunes a todos (excepto colegio) ── */}
          {!isColegio && (
            <div className="pt-1 border-t border-md-outline-variant space-y-4">
              <div>
                <label className="label">WhatsApp <span className="text-md-error">*</span></label>
                <input className="input font-mono" value={form.telefono} onChange={set('telefono')}
                  placeholder="+521XXXXXXXXXX" required />
                <p className="text-xs text-md-on-surface-variant mt-1.5">Con código de país: +5215512345678</p>
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <Mail size={12} className="text-md-on-surface-variant" />
                  Correo electrónico <span className="text-md-on-surface-variant font-normal">(opcional)</span>
                </label>
                <input className="input" type="email" value={form.email} onChange={set('email')}
                  placeholder="contacto@ejemplo.com" />
              </div>

              <div>
                <label className="label">Liga de pago <span className="text-md-on-surface-variant font-normal">(opcional)</span></label>
                <input className="input" value={form.payment_link} onChange={set('payment_link')}
                  placeholder="https://..." />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn-outline text-sm py-2.5">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary text-sm py-2.5 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              {saving ? 'Guardando...' : isColegio ? 'Agregar Familia' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Sync Padron Modal ─────────────────────────────────────────────────────────
function SyncModal({ onClose, onSynced, orgType = 'general' }) {
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleDownloadTemplate = async () => {
    setDownloading(true)
    try {
      const res = await uploadAPI.downloadLayout(orgType)
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Try to get filename from Content-Disposition header
      const cd = res.headers?.['content-disposition'] || ''
      const match = cd.match(/filename="(.+)"/)
      a.download = match ? match[1] : `plantilla_${orgType}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error descargando plantilla:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handleSync = async () => {
    if (!file) return
    setSyncing(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await contactsAPI.sync(fd)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setSyncing(false)
    }
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
          <div className="text-center">
            <div className="w-12 h-12 bg-md-primary-container rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={22} className="text-md-on-primary-container" />
            </div>
            <h2 className="text-base font-semibold text-md-on-surface">Padrón actualizado</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Nuevos', value: result.created, color: 'text-md-primary' },
              { label: 'Actualizados', value: result.updated + result.reactivated, color: 'text-md-tertiary' },
              { label: 'Dados de baja', value: result.deactivated, color: 'text-orange-600' },
              { label: 'Eliminados', value: result.deleted, color: 'text-md-error' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-md-surface-container rounded-2xl p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-md-on-surface-variant mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {result.deleted > 0 && (
            <div className="flex items-start gap-2 p-3 bg-md-error-container rounded-2xl text-xs text-md-on-error-container">
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              <span>{result.deleted} contacto{result.deleted !== 1 ? 's' : ''} eliminado{result.deleted !== 1 ? 's' : ''} definitivamente por vencer el periodo de gracia.</span>
            </div>
          )}

          <button onClick={() => { onSynced(); onClose() }} className="btn-primary w-full text-sm">
            Listo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-md-outline-variant">
          <h2 className="text-base font-semibold text-md-on-surface flex items-center gap-2">
            <RefreshCw size={16} className="text-md-primary" /> Actualizar padrón
          </h2>
          <button onClick={onClose} className="text-md-on-surface-variant hover:text-md-on-surface p-1 rounded-full">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info */}
          <div className="flex items-start gap-2.5 p-3 bg-md-surface-container rounded-2xl text-xs text-md-on-surface-variant leading-relaxed">
            <Info size={13} className="flex-shrink-0 mt-0.5 text-md-primary" />
            <p>
              Sube el nuevo listado completo de miembros (Excel o CSV).
              El sistema comparará por teléfono: los que no aparezcan serán marcados como <strong>inactivos</strong>.
              Los inactivos se eliminarán definitivamente al vencer el periodo de gracia configurado en Ajustes.
            </p>
          </div>

          {/* Warn */}
          <div className="flex items-start gap-2.5 p-3 bg-orange-50 rounded-2xl text-xs text-orange-700 leading-relaxed">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            <p>El archivo debe incluir al menos la columna <strong>teléfono</strong>. Usa la plantilla para asegurar el formato correcto.</p>
          </div>

          {/* Download template */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-md-primary font-medium hover:bg-md-primary-container rounded-xl transition-colors disabled:opacity-50"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Descargar plantilla Excel
          </button>

          {/* File picker */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => setFile(e.target.files[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-md-outline rounded-2xl p-5 text-center hover:border-md-primary hover:bg-md-surface-container transition-colors"
            >
              {file ? (
                <div>
                  <Upload size={20} className="text-md-primary mx-auto mb-1" />
                  <p className="text-sm font-medium text-md-on-surface">{file.name}</p>
                  <p className="text-xs text-md-on-surface-variant mt-0.5">
                    {(file.size / 1024).toFixed(0)} KB · Click para cambiar
                  </p>
                </div>
              ) : (
                <div>
                  <Upload size={20} className="text-md-on-surface-variant mx-auto mb-1" />
                  <p className="text-sm text-md-on-surface-variant">Click para seleccionar archivo</p>
                  <p className="text-xs text-md-on-surface-variant mt-0.5">.xlsx, .xls, .csv</p>
                </div>
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-md-error-container rounded-2xl text-sm text-md-on-error-container">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 btn-outline text-sm">Cancelar</button>
            <button
              onClick={handleSync}
              disabled={!file || syncing}
              className="flex-1 btn-primary text-sm flex items-center justify-center gap-2"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {syncing ? 'Procesando...' : 'Actualizar padrón'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Confirm Deactivate Modal ──────────────────────────────────────────────────
function ConfirmDeactivateModal({ count, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
            <UserMinus size={18} className="text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-md-on-surface">¿Dar de baja {count > 1 ? `${count} contactos` : 'este contacto'}?</h2>
            <p className="text-sm text-md-on-surface-variant mt-1">
              {count > 1 ? 'Quedarán' : 'Quedará'} inactivo{count > 1 ? 's' : ''} y no recibirá{count > 1 ? 'n' : ''} mensajes.
              Puedes reactivar{count > 1 ? 'los' : 'lo'} antes de que venza el periodo de gracia.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-outline text-sm">Cancelar</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-orange-500 text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-orange-600 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
            Dar de baja
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Confirm Delete Modal ──────────────────────────────────────────────────────
function ConfirmDeleteModal({ count, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-md-error-container rounded-full flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-md-error" />
          </div>
          <div>
            <h2 className="font-semibold text-md-on-surface">¿Eliminar definitivamente {count > 1 ? `${count} contactos` : 'este contacto'}?</h2>
            <p className="text-sm text-md-on-surface-variant mt-1">
              Esta acción no se puede deshacer. Se eliminarán junto con su historial.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-outline text-sm">Cancelar</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-md-error text-white px-4 py-2.5 rounded-full text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const { tenant } = useAuthStore()
  const orgType = tenant?.org_type || 'general'
  const orgConfig = getOrgConfig(orgType)
  const isClub = orgType === 'club' || orgType === 'gimnasio'
  const [contacts, setContacts] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusTab, setStatusTab] = useState('active') // 'active' | 'inactive' | 'all'
  const [selected, setSelected] = useState(new Set())

  // Modals
  const [showAdd, setShowAdd] = useState(false)
  const [showSync, setShowSync] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(null) // { ids }
  const [confirmDelete, setConfirmDelete] = useState(null)         // { ids }

  // Toast
  const [toast, setToast] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(0); setSelected(new Set()) }, [debouncedSearch, statusTab])

  const load = useCallback(() => {
    setIsLoading(true)
    setSelected(new Set())
    contactsAPI.list({
      limit: PAGE_SIZE,
      page: page + 1,
      status: statusTab,
      ...(debouncedSearch ? { search: debouncedSearch } : {})
    })
      .then(res => {
        setContacts(res.data.contacts || [])
        setTotal(res.data.pagination?.total || 0)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [page, debouncedSearch, statusTab])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const allSelected = contacts.length > 0 && selected.size === contacts.length
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(contacts.map(c => c.id)))
  }

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleDeactivate = async (ids) => {
    setActionLoading(true)
    try {
      if (ids.length === 1) await contactsAPI.deactivate(ids[0])
      else await contactsAPI.bulkDeactivate(ids)
      showToast(`${ids.length > 1 ? `${ids.length} contactos dados` : 'Contacto dado'} de baja`)
      setConfirmDeactivate(null)
      load()
    } catch (err) {
      showToast(err.response?.data?.error || err.message, true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivate = async (ids) => {
    setActionLoading(true)
    try {
      if (ids.length === 1) await contactsAPI.reactivate(ids[0])
      else await contactsAPI.bulkReactivate(ids)
      showToast(`${ids.length > 1 ? `${ids.length} contactos reactivados` : 'Contacto reactivado'}`)
      load()
    } catch (err) {
      showToast(err.response?.data?.error || err.message, true)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (ids) => {
    setActionLoading(true)
    try {
      await contactsAPI.bulkDelete(ids)
      showToast(`${ids.length > 1 ? `${ids.length} contactos eliminados` : 'Contacto eliminado'} definitivamente`)
      setConfirmDelete(null)
      load()
    } catch (err) {
      showToast(err.response?.data?.error || err.message, true)
    } finally {
      setActionLoading(false)
    }
  }

  const selectedIds = [...selected]

  return (
    <div className="space-y-5">
      {/* Modals */}
      {showAdd && (
        <AddContactModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); showToast('Contacto agregado'); load() }}
          orgType={orgType}
        />
      )}
      {showSync && (
        <SyncModal
          onClose={() => setShowSync(false)}
          onSynced={load}
          orgType={orgType}
        />
      )}
      {confirmDeactivate && (
        <ConfirmDeactivateModal
          count={confirmDeactivate.ids.length}
          loading={actionLoading}
          onClose={() => setConfirmDeactivate(null)}
          onConfirm={() => handleDeactivate(confirmDeactivate.ids)}
        />
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          count={confirmDelete.ids.length}
          loading={actionLoading}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete.ids)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-full text-sm font-medium shadow-md3-3 ${
          toast.isError ? 'bg-md-error-container text-md-on-error-container' : 'bg-md-on-surface text-md-surface'
        }`}>
          {toast.isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-md-on-surface">{orgConfig.contactLabelPlural}</h1>
          <p className="text-sm text-md-on-surface-variant mt-0.5">
            {total.toLocaleString('es-MX')} {statusTab === 'active' ? 'activos' : statusTab === 'inactive' ? 'inactivos' : orgConfig.contactLabelPlural.toLowerCase()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSync(true)}
            className="btn-outline text-sm flex items-center gap-2"
          >
            <RefreshCw size={14} /> Actualizar padrón
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <UserPlus size={14} /> Agregar
          </button>
        </div>
      </div>

      {/* Status tabs + search */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tabs */}
        <div className="flex bg-md-surface-container rounded-full p-1 gap-1">
          {[
            { key: 'active',   label: 'Activos' },
            { key: 'inactive', label: 'Inactivos' },
            { key: 'all',      label: 'Todos' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusTab === tab.key
                  ? 'bg-md-primary-container text-md-on-primary-container'
                  : 'text-md-on-surface-variant hover:text-md-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-md-on-surface-variant" />
          <input
            className="input pl-9"
            placeholder={orgConfig.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-md-primary-container rounded-2xl">
          <span className="text-sm font-medium text-md-on-primary-container flex-1">
            {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
          </span>
          {statusTab !== 'inactive' && (
            <button
              onClick={() => setConfirmDeactivate({ ids: selectedIds })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/80 text-orange-700 rounded-full hover:bg-white transition-colors"
            >
              <UserMinus size={13} /> Dar de baja
            </button>
          )}
          {statusTab === 'inactive' && (
            <button
              onClick={() => handleReactivate(selectedIds)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/80 text-md-primary rounded-full hover:bg-white transition-colors"
            >
              {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />} Reactivar
            </button>
          )}
          {statusTab === 'inactive' && (
            <button
              onClick={() => setConfirmDelete({ ids: selectedIds })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-md-error text-white rounded-full hover:opacity-90 transition-opacity"
            >
              <Trash2 size={13} /> Eliminar
            </button>
          )}
          <button
            onClick={() => setSelected(new Set())}
            className="p-1 rounded-full text-md-on-primary-container/60 hover:text-md-on-primary-container"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-md-primary animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-14">
            <Users size={40} className="text-md-outline-variant mx-auto mb-3" />
            <p className="text-md-on-surface font-medium">
              {search ? 'No se encontraron contactos' : statusTab === 'inactive' ? 'No hay contactos inactivos' : 'Aún no hay contactos'}
            </p>
            <p className="text-md-on-surface-variant text-sm mt-1 mb-4">
              {search ? 'Intenta con otro término' : 'Agrega contactos manualmente o actualiza el padrón'}
            </p>
            {!search && statusTab === 'active' && (
              <button onClick={() => setShowAdd(true)} className="btn-primary inline-flex items-center gap-2 text-sm">
                <UserPlus size={14} /> Agregar contacto
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-md-outline-variant bg-md-surface-container-low">
                  <tr>
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={el => { if (el) el.indeterminate = someSelected }}
                        onChange={toggleAll}
                        className="rounded accent-md-primary cursor-pointer"
                      />
                    </th>
                    {[
                      orgConfig.contactLabel,
                      'Teléfono',
                      orgConfig.groupLabel,
                      ...(isClub ? [orgConfig.idExternoLabel] : []),
                      ...(tenant?.spei_addon_enabled ? ['CLABE SPEI'] : []),
                      statusTab !== 'active' ? 'Inactivo desde' : 'Alta',
                      'Acciones'
                    ].map(h => (
                      <th key={h} className="py-3 px-3 text-left text-xs font-semibold text-md-on-surface-variant uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => {
                    const isSelected = selected.has(c.id)
                    const inactive = c.status === 'inactive'
                    const days = inactive ? daysSince(c.inactive_since) : null

                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-md-outline-variant/50 transition-colors ${
                          isSelected ? 'bg-md-primary-container/30' : 'hover:bg-md-surface-container-low'
                        }`}
                      >
                        <td className="py-3 px-4 w-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(c.id)}
                            className="rounded accent-md-primary cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <p className={`text-sm font-medium ${inactive ? 'text-md-on-surface-variant' : 'text-md-on-surface'}`}>
                            {[c.nombre, c.apellido].filter(Boolean).join(' ')}
                          </p>
                          {c.nombre_alumno && (
                            <p className="text-xs text-md-on-surface-variant mt-0.5">
                              {orgConfig.studentLabel || 'Alumno'}: {c.nombre_alumno}
                            </p>
                          )}
                          {inactive && (
                            <span className="inline-flex items-center gap-1 text-xs text-orange-600 mt-0.5">
                              <UserMinus size={10} /> Inactivo
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-sm text-md-on-surface-variant font-mono">{c.telefono}</td>
                        <td className="py-3 px-3 text-sm text-md-on-surface-variant">{c.grupo || '—'}</td>
                        {isClub && (
                          <td className="py-3 px-3 text-sm text-md-on-surface-variant font-mono">{c.id_externo || '—'}</td>
                        )}
                        {tenant?.spei_addon_enabled && (
                          <td className="py-3 px-3">
                            {c.clabe
                              ? <span className="font-mono text-xs text-md-on-surface bg-md-surface-container px-2 py-1 rounded-lg">{c.clabe}</span>
                              : <span className="text-xs text-md-on-surface-variant italic">Sin CLABE</span>
                            }
                          </td>
                        )}
                        <td className="py-3 px-3 text-sm text-md-on-surface-variant">
                          {inactive && days !== null ? (
                            <span className={`text-xs ${days > 20 ? 'text-md-error font-medium' : 'text-orange-600'}`}>
                              hace {days} día{days !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            formatDate(c.created_at)
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            {!inactive ? (
                              <button
                                onClick={() => setConfirmDeactivate({ ids: [c.id] })}
                                title="Dar de baja"
                                className="p-1.5 rounded-full text-md-on-surface-variant hover:text-orange-600 hover:bg-orange-50 transition-colors"
                              >
                                <UserMinus size={15} />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleReactivate([c.id])}
                                  disabled={actionLoading}
                                  title="Reactivar"
                                  className="p-1.5 rounded-full text-md-on-surface-variant hover:text-md-primary hover:bg-md-primary-container transition-colors"
                                >
                                  <UserCheck size={15} />
                                </button>
                                <button
                                  onClick={() => setConfirmDelete({ ids: [c.id] })}
                                  title="Eliminar definitivamente"
                                  className="p-1.5 rounded-full text-md-on-surface-variant hover:text-md-error hover:bg-md-error-container transition-colors"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-md-outline-variant">
                <p className="text-sm text-md-on-surface-variant">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
                </p>
                <div className="flex gap-2 items-center">
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                    className="p-1.5 rounded-full border border-md-outline text-md-on-surface-variant hover:border-md-primary hover:text-md-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-md-on-surface-variant px-2">{page + 1} / {totalPages}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-full border border-md-outline text-md-on-surface-variant hover:border-md-primary hover:text-md-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
