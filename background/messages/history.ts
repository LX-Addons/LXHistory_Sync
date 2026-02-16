import type { PlasmoMessaging } from '@plasmohq/messaging'
import { getLocalHistory } from '~common/history'
import { syncToCloud, syncFromCloud } from '~common/webdav'
import { Logger } from '~common/logger'
import { recordSyncHistory } from '~common/syncHistory'
import type { HistoryItem } from '~common/types'

interface HistoryRequestBody {
  action: 'SYNC_TO_CLOUD' | 'SYNC_FROM_CLOUD'
}

interface HistoryResponse {
  success: boolean
  data?: HistoryItem[]
  error?: string
}

const handler: PlasmoMessaging.MessageHandler<HistoryRequestBody, HistoryResponse> = async (
  req,
  res
) => {
  const action = req.body?.action

  try {
    switch (action) {
      case 'SYNC_TO_CLOUD': {
        Logger.info('Syncing to cloud')
        const localHistory = await getLocalHistory()
        const result = await syncToCloud(localHistory)
        if (result.success) {
          await recordSyncHistory({
            direction: 'to_cloud',
            success: true,
            itemCount: result.items?.length,
          })
          res.send({ success: true, data: result.items })
        } else {
          await recordSyncHistory({
            direction: 'to_cloud',
            success: false,
            errorMessage: result.error || result.message,
          })
          res.send({ success: false, error: result.error || result.message })
        }
        break
      }

      case 'SYNC_FROM_CLOUD': {
        Logger.info('Syncing from cloud')
        try {
          const history = await syncFromCloud()
          await recordSyncHistory({
            direction: 'from_cloud',
            success: true,
            itemCount: history.length,
          })
          res.send({ success: true, data: history })
        } catch (error) {
          await recordSyncHistory({
            direction: 'from_cloud',
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          })
          throw error
        }
        break
      }

      default:
        res.send({ success: false, error: 'Unknown action' })
    }
  } catch (error) {
    Logger.error('History operation failed', error)
    res.send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export default handler
