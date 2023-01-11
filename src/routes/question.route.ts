import { Router } from 'express'
import authorize from '../auth/authorize'

import {
	questionAdd,
	questionDelete,
	questionDetails,
	questionListAll,
	questionListAllV2,
	questionSeed,
	questionUpdate,
	questionUpdateStatus
} from '../controllers/question.controller'

const router = Router()

router.post('/add', authorize([1, 2]), questionAdd)

router.post('/seed', authorize([1, 2]), questionSeed)

router.get('/list/all', authorize([1, 2]), questionListAll)

router.get('/list/all/v2', authorize([1, 2]), questionListAllV2)

router.get('/:id', authorize([1, 2]), questionDetails)

router.put('/:id', authorize([1, 2]), questionUpdate)

router.put('/status/:id', authorize([1, 2]), questionUpdateStatus)

router.delete('/:id', authorize([1, 2]), questionDelete)

export default router
