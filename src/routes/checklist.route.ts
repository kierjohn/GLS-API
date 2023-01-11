import { Router } from 'express'
import authorize from '../auth/authorize'

import {
	create,
	update,
	remove,
	list,
	details,
	updateStatus
} from '../controllers/checklist.controller'

const router = Router()

router.post('/add', authorize([1, 2]), create)

router.get('/list/all', authorize([1, 2]), list)

router.get('/:id', authorize([1, 2]), details)

router.put('/:id', authorize([1, 2]), update)

router.put('/status/:id', authorize([1, 2]), updateStatus)

router.delete('/:id', authorize([1, 2]), remove)

export default router
