import type { HistoryItem, ExportResult } from './types'

export interface SyncToCloudRequest {
  action: 'SYNC_TO_CLOUD'
}

export interface SyncFromCloudRequest {
  action: 'SYNC_FROM_CLOUD'
}

export interface ExportRequest {
  action: 'EXPORT_JSON' | 'EXPORT_CSV'
}

export interface SyncResponse {
  success: boolean
  data?: HistoryItem[]
  error?: string
}

export type HistoryRequest = SyncToCloudRequest | SyncFromCloudRequest

export type MessageMap = {
  history: {
    request: HistoryRequest
    response: SyncResponse
  }
  export: {
    request: ExportRequest
    response: ExportResult
  }
}

export interface MessageRequest<Body = unknown> {
  name: string
  body?: Body
}

export interface MessageResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export async function sendToBackground<Req, Res>(request: MessageRequest<Req>): Promise<Res> {
  const messaging = await import('@plasmohq/messaging')
  return messaging.sendToBackground(
    request as Parameters<typeof messaging.sendToBackground>[0]
  ) as Promise<Res>
}
