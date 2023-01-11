import { Router } from 'express'
import authorize from '../auth/authorize'
import {
	loginAsUser,
	recoverAccount,
	resetPassword,
	userAdd,
	userAddAdmin,
	userDelete,
	userDetails,
	userDownloadData,
	userListAll,
	userListFiltered,
	userLogin,
	userProfile,
	userProfileUpdate,
	userRegister,
	userReports,
	userResendVerification,
	userUpdate,
	userUpdateStatus,
	userUploadImage,
	userVerifyAccount,
	validateToken
} from '../controllers/user.controller'

const router = Router()

router.get('/reports', authorize([1, 2]), userReports)

router.post('/login', userLogin)

router.post('/register', userRegister)

router.post('/add/admin', authorize([1]), userAddAdmin)

router.post('/add', authorize([1]), userAdd)

router.get('/list/all', authorize([1]), userListAll)

router.get('/list/filter', authorize([1]), userListFiltered)

router.get('/:id', authorize([1, 2]), userDetails)

router.get('/profile/me', authorize([1, 2]), userProfile)

router.get('/download/:id', authorize([1, 2]), userDownloadData)

router.put('/profile/update', authorize([1, 2]), userProfileUpdate)

router.post('/upload/image', authorize([1, 2]), userUploadImage)

router.put('/:id', authorize([1]), userUpdate)

router.delete('/:id', authorize([1, 2]), userDelete)

router.put('/status/:id', authorize([1, 2]), userUpdateStatus)

router.post('/forget-password', recoverAccount)

router.get('/validate-token/:token', validateToken)

router.post('/reset-password/:token', resetPassword)

router.post('/send-verification', userResendVerification)

router.post('/verify-account/:token', userVerifyAccount)

router.post('/login/view', authorize([1]), loginAsUser)

export default router
