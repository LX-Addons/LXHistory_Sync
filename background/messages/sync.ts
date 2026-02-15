import type { PlasmoMessaging } from '@plasmohq/messaging'
import { Logger } from '~common/logger'

interface SyncRequestBody {
  action?: 'SYNC_DATA' | 'UPDATE_SYNC_SETTINGS'
}

const handler: PlasmoMessaging.MessageHandler<SyncRequestBody> = async (req, res) => {
  const action = req.body?.action

  if (action === 'SYNC_DATA') {
    Logger.info('Sync requested from popup')
    try {
      const { performScheduledSync } = await import('../index')
      await performScheduledSync()
      res.send({ success: true })
    } catch (error) {
      Logger.error('Sync failed', error)
      res.send({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  } else if (action === 'UPDATE_SYNC_SETTINGS') {
    Logger.info('Sync settings updated')
    try {
      const { setupAlarms } = await import('../index')
      await setupAlarms()
      res.send({ success: true })
    } catch (error) {
      Logger.error('Failed to update sync settings', error)
      res.send({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  } else {
    res.send({ success: false, error: 'Unknown action' })
  }
}

export default handler
