import { Router } from 'express'
import authorize from '../auth/authorize'

import {
	locationAdd,
	locationDelete,
	locationDetails,
	locationListAll,
	locationListFiltered,
	locationSeed,
	locationUpdate,
	locationUpdateStatus
} from '../controllers/location.controller'

const router = Router()

router.post('/add', authorize([1, 2]), locationAdd)

router.get('/seed', authorize([1, 2]), locationSeed)

router.get('/list/all', authorize([1, 2]), locationListAll)

router.get('/list/filter', authorize([1, 2]), locationListFiltered)

router.get('/:id', authorize([1, 2]), locationDetails)

router.put('/:id', authorize([1, 2]), locationUpdate)

router.put('/status/:id', authorize([1, 2]), locationUpdateStatus)

router.delete('/:id', authorize([1, 2]), locationDelete)

export default router
