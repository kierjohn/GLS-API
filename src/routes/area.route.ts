import { Router } from 'express'
import authorize from '../auth/authorize'

import {
	areaAdd,
	areaDelete,
	areaDetails,
	areaListAll,
	areaListFiltered,
	areaSeed,
	areaUpdate,
	areaUpdateStatus,
	areaUploadImage
} from '../controllers/area.controller'

const router = Router()

router.post('/add', authorize([1, 2]), areaAdd)

router.post('/upload/image', authorize([1, 2]), areaUploadImage)

router.get('/seed', authorize([1, 2]), areaSeed)

router.get('/list/all', authorize([1, 2]), areaListAll)

router.get('/list/filter', authorize([1, 2]), areaListFiltered)

router.get('/:id', authorize([1, 2]), areaDetails)

router.put('/:id', authorize([1, 2]), areaUpdate)

router.put('/status/:id', authorize([1, 2]), areaUpdateStatus)

router.delete('/:id', authorize([1, 2]), areaDelete)

export default router
