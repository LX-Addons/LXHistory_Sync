import type { PlasmoMessaging } from '@plasmohq/messaging'
import { Logger } from '~common/logger'

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  if (req.name === 'SYNC_DATA') {
    Logger.info('Sync requested from popup')
    try {
      const mod = await import('../index')
      await mod.performScheduledSync()
      res.send({ success: true })
    } catch (error) {
      Logger.error('Sync failed', error)
      res.send({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  } else if (req.name === 'UPDATE_SYNC_SETTINGS') {
    Logger.info('Sync settings updated')
    try {
      const mod = await import('../index')
      await mod.startSyncTimer()
      res.send({ success: true })
    } catch (error) {
      Logger.error('Failed to update sync settings', error)
      res.send({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }
}

export default handler
