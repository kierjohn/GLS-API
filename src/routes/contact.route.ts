import { Router } from 'express'
import authorize from '../auth/authorize'

import {
	sendContact,
} from '../controllers/contact.controller'

const router = Router()

router.post('/add', authorize([1, 2]), sendContact)


export default router
