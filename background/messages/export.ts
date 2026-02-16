import type { PlasmoMessaging } from '@plasmohq/messaging'
import { getLocalHistory } from '~common/history'
import { Logger } from '~common/logger'
import type { ExportResult, HistoryItem } from '~common/types'

interface ExportRequestBody {
  action: 'EXPORT_JSON' | 'EXPORT_CSV'
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

function generateCSV(history: HistoryItem[]): string {
  const BOM = '\uFEFF'
  const headers = ['URL', '标题', '最后访问时间', '访问次数']
  const headerLine = headers.join(',')
  const dataLines = history.map(item => {
    const url = escapeCSVField(item.url)
    const title = escapeCSVField(item.title || '')
    const lastVisitTime = escapeCSVField(formatDate(item.lastVisitTime))
    const visitCount = item.visitCount.toString()
    return `${url},${title},${lastVisitTime},${visitCount}`
  })
  return BOM + headerLine + '\n' + dataLines.join('\n')
}

function generateJSON(history: HistoryItem[]): string {
  return JSON.stringify(history, null, 2)
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function stringToBase64(str: string): string {
  const encoder = new TextEncoder()
  const uint8Array = encoder.encode(str)
  return arrayBufferToBase64(uint8Array.buffer)
}

const handler: PlasmoMessaging.MessageHandler<ExportRequestBody, ExportResult> = async (
  req,
  res
) => {
  const action = req.body?.action

  try {
    Logger.info(`Exporting data: ${action}`)
    const history = await getLocalHistory()
    const timestamp = new Date().toISOString().slice(0, 10)

    switch (action) {
      case 'EXPORT_JSON': {
        const jsonContent = generateJSON(history)
        const base64Data = stringToBase64(jsonContent)
        res.send({
          success: true,
          data: base64Data,
          filename: `history_export_${timestamp}.json`,
        })
        break
      }

      case 'EXPORT_CSV': {
        const csvContent = generateCSV(history)
        const base64Data = stringToBase64(csvContent)
        res.send({
          success: true,
          data: base64Data,
          filename: `history_export_${timestamp}.csv`,
        })
        break
      }

      default:
        res.send({ success: false, error: 'Unknown export action' })
    }
  } catch (error) {
    Logger.error('Export operation failed', error)
    res.send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export default handler
