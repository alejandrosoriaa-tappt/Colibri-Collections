const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    classes: 'bg-gray-100 text-gray-700 border-gray-200'
  },
  paid: {
    label: 'Pagado',
    classes: 'bg-green-100 text-green-800 border-green-200'
  },
  suspended: {
    label: 'Suspendido',
    classes: 'bg-gray-200 text-gray-600 border-gray-300'
  },
  draft: {
    label: 'Borrador',
    classes: 'bg-gray-100 text-gray-600 border-gray-200'
  },
  active: {
    label: 'Activo',
    classes: 'bg-green-100 text-green-800 border-green-200'
  },
  paused: {
    label: 'Pausado',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  completed: {
    label: 'Completado',
    classes: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  trial: {
    label: 'En prueba',
    classes: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  cancelled: {
    label: 'Cancelado',
    classes: 'bg-red-100 text-red-700 border-red-200'
  },
  inactive: {
    label: 'Inactivo',
    classes: 'bg-gray-100 text-gray-500 border-gray-200'
  },
  failed: {
    label: 'Fallido',
    classes: 'bg-red-100 text-red-700 border-red-200'
  },
  delivered: {
    label: 'Entregado',
    classes: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  read: {
    label: 'Leído',
    classes: 'bg-indigo-100 text-indigo-700 border-indigo-200'
  },
  sent: {
    label: 'Enviado',
    classes: 'bg-green-50 text-green-700 border-green-200'
  },
  processing: {
    label: 'Procesando',
    classes: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  error: {
    label: 'Error',
    classes: 'bg-red-100 text-red-700 border-red-200'
  }
}

export default function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Desconocido',
    classes: 'bg-gray-100 text-gray-600 border-gray-200'
  }

  const sizeClasses = size === 'xs'
    ? 'px-1.5 py-0.5 text-xs'
    : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses} ${config.classes}`}
    >
      {config.label}
    </span>
  )
}
