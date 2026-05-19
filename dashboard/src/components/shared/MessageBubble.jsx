import { CheckCheck, Check, Clock, AlertCircle } from 'lucide-react'

const MESSAGE_LABELS = {
  1: 'M1',
  2: 'M2',
  3: 'M3',
  4: 'M4'
}

function StatusIcon({ status }) {
  if (status === 'read') return <CheckCheck size={14} className="text-blue-500" />
  if (status === 'delivered') return <CheckCheck size={14} className="text-gray-400" />
  if (status === 'sent') return <Check size={14} className="text-gray-400" />
  if (status === 'failed') return <AlertCircle size={14} className="text-red-500" />
  return <Clock size={14} className="text-gray-300" />
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('es-MX', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function MessageBubble({ text, sentAt, status, messageNumber }) {
  const label = MESSAGE_LABELS[messageNumber] || `M${messageNumber}`

  return (
    <div className="flex justify-end mb-3">
      <div className="max-w-xs lg:max-w-md">
        {messageNumber && (
          <div className="flex justify-end mb-1">
            <span className="text-xs font-semibold text-colibri bg-colibri-50 px-2 py-0.5 rounded-full border border-colibri-100">
              {label}
            </span>
          </div>
        )}
        <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm relative">
          <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{text}</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            {sentAt && (
              <span className="text-xs text-gray-500">{formatDateTime(sentAt)}</span>
            )}
            <StatusIcon status={status} />
          </div>
        </div>
      </div>
    </div>
  )
}
