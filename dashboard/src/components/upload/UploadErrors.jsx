import { Download, AlertCircle } from 'lucide-react'

export default function UploadErrors({ errors }) {
  if (!errors || errors.length === 0) return null

  const exportToCSV = () => {
    const headers = ['Fila', 'Campo', 'Error']
    const rows = errors.map(e => [e.row, e.field, e.error])
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'errores_importacion.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500" />
          <h4 className="text-sm font-semibold text-gray-700">
            Errores encontrados ({errors.length})
          </h4>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-1.5 text-xs text-colibri hover:text-colibri-dark font-medium transition-colors"
        >
          <Download size={13} />
          Exportar errores
        </button>
      </div>

      <div className="border border-red-200 rounded-xl overflow-hidden">
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-red-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-red-700 w-16">Fila</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-red-700 w-28">Campo</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-red-700">Error</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-red-100">
              {errors.map((err, i) => (
                <tr key={i} className="hover:bg-red-50 transition-colors">
                  <td className="px-4 py-2 text-xs text-gray-600 font-mono">{err.row}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">{err.field}</td>
                  <td className="px-4 py-2 text-xs text-red-600">{err.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
