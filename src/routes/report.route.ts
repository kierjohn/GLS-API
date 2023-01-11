import { Router } from 'express'
import authorize from '../auth/authorize'

import {
	counter
} from '../controllers/audit.controller'

const router = Router()

router.get('/list/counter', authorize([1, 2]), counter)

export default router
