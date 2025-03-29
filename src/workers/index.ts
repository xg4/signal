import { logger } from '../utils/log'
import { initWebPush } from '../utils/push'
import './notification'
import './recurrence'
import './reminder'

initWebPush()
logger.info('🚀 工作进程已启动')
