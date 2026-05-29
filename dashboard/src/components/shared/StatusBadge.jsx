const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    classes: 'bg-md-surface-container text-md-on-surface-variant'
  },
  paid: {
    label: 'Pagado',
    classes: 'bg-green-100 text-green-800'
  },
  suspended: {
    label: 'Suspendido',
    classes: 'bg-md-surface-container-high text-md-on-surface-variant'
  },
  draft: {
    label: 'Borrador',
    classes: 'bg-md-surface-container text-md-on-surface-variant'
  },
  active: {
    label: 'Activo',
    classes: 'bg-md-primary-container text-md-on-primary-container'
  },
  paused: {
    label: 'Pausado',
    classes: 'bg-yellow-100 text-yellow-800'
  },
  completed: {
    label: 'Completado',
    classes: 'bg-md-secondary-container text-md-on-secondary-container'
  },
  trial: {
    label: 'En prueba',
    classes: 'bg-orange-100 text-orange-800'
  },
  cancelled: {
    label: 'Cancelado',
    classes: 'bg-md-error-container text-md-on-error-container'
  },
  inactive: {
    label: 'Inactivo',
    classes: 'bg-md-surface-container text-md-on-surface-variant'
  },
  failed: {
    label: 'Fallido',
    classes: 'bg-md-error-container text-md-on-error-container'
  },
  delivered: {
    label: 'Entregado',
    classes: 'bg-md-tertiary-container text-md-on-tertiary-container'
  },
  read: {
    label: 'Leído',
    classes: 'bg-md-primary-container text-md-on-primary-container'
  },
  sent: {
    label: 'Enviado',
    classes: 'bg-md-primary-container/60 text-md-on-primary-container'
  },
  processing: {
    label: 'Procesando',
    classes: 'bg-md-tertiary-container text-md-on-tertiary-container'
  },
  error: {
    label: 'Error',
    classes: 'bg-md-error-container text-md-on-error-container'
  }
}

export default function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Desconocido',
    classes: 'bg-md-surface-container text-md-on-surface-variant'
  }

  const sizeClasses = size === 'xs'
    ? 'px-1.5 py-0.5 text-xs'
    : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${config.classes}`}
    >
      {config.label}
    </span>
  )
}
