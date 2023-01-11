import { Router } from 'express'
import authorize from '../auth/authorize'

import {
	categoryAdd,
	categorySeed,
	categoryListAll,
	categoryListFiltered,
	categoryDetails,
	categoryUpdate,
	categoryUpdateStatus,
	categoryDelete
} from '../controllers/category.controller'

const router = Router()

router.post('/add', authorize([1, 2]), categoryAdd)

router.get('/seed', authorize([1, 2]), categorySeed)

router.get('/list/all', authorize([1, 2]), categoryListAll)

router.get('/list/filter', authorize([1, 2]), categoryListFiltered)

router.get('/:id', authorize([1, 2]), categoryDetails)

router.put('/:id', authorize([1, 2]), categoryUpdate)

router.put('/status/:id', authorize([1, 2]), categoryUpdateStatus)

router.delete('/:id', authorize([1, 2]), categoryDelete)

export default router
