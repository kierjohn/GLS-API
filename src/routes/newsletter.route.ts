import { Router } from 'express'
import authorize from '../auth/authorize'

import {
	sendNewsLetter,
    subscribeNewsLetter,
    unsubscribeNewsLetter
} from '../controllers/newsletter.controller'

const router = Router()

router.post('/subscribe', authorize([1, 2]), subscribeNewsLetter)
router.post('/unsubscribe', authorize([1, 2]), unsubscribeNewsLetter)
router.get('/send', authorize([1, 2]), sendNewsLetter)

export default router
