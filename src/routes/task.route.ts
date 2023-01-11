import { Router } from 'express'
import authorize from '../auth/authorize'

import {
	taskAdd,
	taskDelete,
	taskDetails,
	taskListAll,
	taskListFiltered,
	taskUpdate,
	taskUpdateStatus,
	taskUploadImage
} from '../controllers/task.controller'

const router = Router()

router.post('/add', authorize([1, 2]), taskAdd)

router.post('/upload/image', authorize([1, 2]), taskUploadImage)

router.get('/list/all', authorize([1, 2]), taskListAll)

router.get('/list/filter', authorize([1, 2]), taskListFiltered)

router.get('/:id', authorize([1, 2]), taskDetails)

router.put('/:id', authorize([1, 2]), taskUpdate)

router.put('/status/:id', authorize([1, 2]), taskUpdateStatus)

router.delete('/:id', authorize([1, 2]), taskDelete)

export default router
