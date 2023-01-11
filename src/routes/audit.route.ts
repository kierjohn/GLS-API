import { Router } from 'express'
import authorize from '../auth/authorize'

import {
	auditAdd,
	auditDelete,
	auditDetails,
	auditHistoryListAll,
	auditListAll,
	auditListFilteredV2,
	auditUpdate,
	auditUpdateStatus,
	auditUploadImage,
	reportAll,
	reportByArea,
	shareReport
} from '../controllers/audit.controller'

const router = Router()

router.post('/add', authorize([1, 2]), auditAdd)

router.post('/share', authorize([1, 2]), shareReport)

router.post('/upload/image', authorize([1, 2]), auditUploadImage)

router.get('/list/all', authorize([1, 2]), auditListAll)

router.get('/history/list/all', authorize([1, 2]), auditHistoryListAll)

router.get('/list/filter', authorize([1, 2]), auditListFilteredV2)

router.get('/report/all', authorize([1, 2]), reportAll)

router.get('/report/area/:area', authorize([1, 2]), reportByArea)

router.get('/:id', authorize([1, 2]), auditDetails)

router.put('/:id', authorize([1, 2]), auditUpdate)

router.put('/status/:id', authorize([1, 2]), auditUpdateStatus)

router.delete('/:id', authorize([1, 2]), auditDelete)

export default router
