import { Router } from 'express'
import authorize from '../auth/authorize'

import { activityListAll, activityListFiltered } from '../controllers/activity.controller'

const router = Router()

router.get('/list/all', authorize([1, 2]), activityListAll)

router.get('/list/filter', authorize([1, 2]), activityListFiltered)

export default router
