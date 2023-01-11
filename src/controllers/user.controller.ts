import sgMail from '@sendgrid/mail'
import AdmZip from 'adm-zip'
import bcrypt from 'bcryptjs'
import { Request, Response } from 'express'
import { existsSync } from 'fs'
import jwt from 'jsonwebtoken'
import { each, filter, flatMap, isNil, map } from 'lodash'
import multer from 'multer'
import path from 'path'
import Area from '../models/area.model'
import Audit from '../models/audit.model'
import Location from '../models/location.model'
import Task from '../models/task.model'
import User, { UserType } from '../models/user.model'
import { generateUniqueAccountName, translate } from '../utils/helpers'

const EMAIL_VALIDATION =
	/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

const appSecret: string = `${process.env.APP_SECRET}`
const bucket: string = './public/images/user/'
const storageEngine = multer.diskStorage({
	destination: (req: any, file: any, callback: any) => {
		callback(null, bucket)
	},
	filename: (req: any, file: any, callback: any) => {
		const extArray = file.mimetype.split('/')
		const extension = extArray[extArray.length - 1]

		callback(null, `${req.userId}.${extension}`)
	}
})

const upload = multer({
	storage: storageEngine
}).single('image')

export const userLogin = (req: any, res: any) => {
	if (!req.body.username) {
		return res.status(400).send({
			error: true,
			message: translate('contact.email.empty', req)
		})
	} else if (!req.body.password) {
		return res.status(400).send({
			error: true,
			message: translate('user.login.password.empty', req)
		})
	}

	const email = String(req.body.username).toLowerCase()

	User.findOne({ $or: [{ email }, { username: email }] })
		.then((user: any) => {
			if (!user) {
				return res.status(400).send({
					error: true,
					message: translate('user.login.invalid.credentials', req)
				})
			}

			let passwordIsValid = bcrypt.compareSync(req.body.password, user.password)

			if (!passwordIsValid) {
				return res.status(400).send({
					error: true,
					message: translate('user.login.invalid.credentials', req)
				})
			}

			if (user['status'] != 1) {
				return res.status(400).send({
					error: true,
					message: translate('user.login.account.suspended', req)
				})
			}

			let language = 'en'
			if (user.language) {
				language = user.language
			}

			let token = jwt.sign(
				{ id: user._id, role: user.role, language: language },
				appSecret,
				{
					expiresIn: 604800
				}
			)

			user.updateLastActive()
			user.save()
			res.status(200).send({
				error: false,
				message: translate('user.login.success', req),
				data: {
					token: token
				}
			})
		})
		.catch((err: any) => {
			res.status(400).send({
				error: true,
				message: err.message || translate('user.login.error', req)
			})
		})
}

export const loginAsUser = async (req: any, res: any) => {
	if (!req.body.username) {
		return res.status(400).send({
			error: true,
			message: translate('contact.email.empty', req)
		})
	}

	try {
		const email = String(req.body.username).toLowerCase()
		const data = await User.findOne({
			$or: [{ email }, { username: email }]
		}).exec()

		if (!data) {
			return res.status(400).send({
				error: true,
				message: translate('user.login.invalid.credentials', req)
			})
		}

		if (data['status'] != 1) {
			return res.status(400).send({
				error: true,
				message: translate('user.login.account.suspended', req)
			})
		}

		let token = jwt.sign({ id: data._id, role: data.role }, appSecret, {
			expiresIn: 604800
		})

		res.status(200).send({
			error: false,
			message: translate('user.login.success', req),
			data: {
				token: token
			}
		})
	} catch (err: any) {
		if (err.code == 11000) {
			if (err.message.includes('username')) {
				res.status(400).send({
					error: true,
					message: translate('user.login.username.invalid', req)
				})
			} else {
				res.status(400).send({
					error: true,
					message: translate('user.login.email.invalid', req)
				})
			}
		} else {
			res.status(400).send({
				error: true,
				message: err.message || translate('user.add.error', req)
			})
		}
	}
}

export const userRegister = async (req: any, res: any) => {
	if (!req.body.email) {
		return res.status(400).send({
			error: true,
			message: translate('user.userRegister.email.empty', req)
		})
	}

	if (!EMAIL_VALIDATION.test(req.body.email)) {
		return res.status(400).send({
			error: true,
			message: translate('user.userRegister.email.invalid', req)
		})
	}

	if (!req.body.password) {
		return res.status(400).send({
			error: true,
			message: translate('user.login.password.empty', req)
		})
	}

	if (req.body.password.length <= 7) {
		return res.status(400).send({
			error: true,
			message: translate('user.userRegister.password.invalid', req)
		})
	}

	const email = String(req.body.email).toLowerCase()
	const username = generateUniqueAccountName(email, User)

	const hashedPassword = bcrypt.hashSync(req.body.password, 8)

	const user = new User({
		accept_cookies: false,
		email,
		language: 'en',
		password: hashedPassword,
		role: 2,
		status: 1,
		target_score: 75,
		task_order: [],
		theme: 'light',
		username,
		verified: false,
		issues: false,
		last_active: new Date()
	})

	try {
		const result = await user.save()
		const location = new Location({
			name: 'default',
			description: '',
			status: 1,
			created_by: result._id
		})
		await location.save()

		await userSendVerification(req, res, () =>
			res.status(200).send({
				error: false,
				message: translate('user.userRegister.success', req),
				data: result
			})
		)
	} catch (err: any) {
		if (err.code == 11000) {
			if (err.message.includes('username')) {
				res.status(400).send({
					error: true,
					message: translate('user.login.username.invalid', req)
				})
			} else {
				res.status(400).send({
					error: true,
					message: translate('user.login.email.invalid', req)
				})
			}
		} else {
			res.status(400).send({
				error: true,
				message: err.message || translate('user.add.error', req)
			})
		}
	}
}

export const userAdd = function (req: any, res: any) {
	if (!req.body.email) {
		return res.status(400).send({
			error: true,
			message: translate('user.userRegister.email.empty', req)
		})
	}

	if (!EMAIL_VALIDATION.test(req.body.email)) {
		return res.status(400).send({
			error: true,
			message: translate('user.userRegister.email.invalid', req)
		})
	}

	if (!req.body.password) {
		return res.status(400).send({
			error: true,
			message: translate('user.login.password.empty', req)
		})
	}

	if (req.body.password.length <= 7) {
		return res.status(400).send({
			error: true,
			message: translate('user.userRegister.password.invalid', req)
		})
	}

	if (!req.body.role) {
		return res.status(400).send({
			error: true,
			message: translate('user.add.role.empty', req)
		})
	}

	const email = String(req.body.email).toLowerCase()
	const hashedPassword = bcrypt.hashSync(req.body.password, 8)

	if (req.userId) {
		let user = new User({
			first_name: req.body.first_name,
			last_name: req.body.last_name,
			created_by: req.userId,
			email,
			password: hashedPassword,
			role: req.body.role,
			status: req.body.status,
			task_order: [],
			username: req.body.username,
			verified: req.body.verified,
			last_active: new Date()
		})

		user
			.save()
			.then((user: any) => {
				if (req.userId) {
					res.status(200).send({
						error: false,
						message: translate('user.add.success', req),
						data: {
							created_by: user['created_by'],
							created_at: user.createdAt,
							email: user['email'],
							first_name: user['first_name'],
							id: user['_id'],
							last_name: user['last_name'],
							role: user['role'],
							status: user['status'],
							task_order: user['task_order'],
							username: user['username'],
							verified: user['verified'],
							last_active: user['last_active']
						}
					})
				} else {
					res.status(200).send({
						error: false,
						message: translate('user.adding.success', req),
						data: {
							created_at: user.createdAt,
							email: user['email'],
							id: user['_id'],
							role: user['role'],
							status: user['status'],
							username: user['username'],
							verified: user['verified'],
							task_order: user['task_order'],
							last_active: user['last_active']
						}
					})
				}
			})
			.catch((err: any) => {
				if (err.code == 11000) {
					if (err.message.includes('username')) {
						res.status(400).send({
							error: true,
							message: translate('user.login.username.invalid', req)
						})
					} else {
						res.status(400).send({
							error: true,
							message: translate('user.login.email.invalid', req)
						})
					}
				} else {
					res.status(400).send({
						error: true,
						message: err.message || translate('user.add.error', req)
					})
				}
			})
	}
}

export const userAddAdmin = function (req: any, res: any) {
	if (!req.body.email) {
		return res.status(400).send({
			error: true,
			message: translate('contact.email.empty', req)
		})
	}

	if (!req.body.password) {
		return res.status(400).send({
			error: true,
			message: translate('user.login.password.empty', req)
		})
	}
	const email = String(req.body.username).toLowerCase()
	const username = generateUniqueAccountName(email, User)

	var hashedPassword = bcrypt.hashSync(req.body.password, 8)

	const user = new User({
		email,
		password: hashedPassword,
		role: 1,
		status: 1,
		task_order: [],
		username,
		verified: true
	})

	user
		.save()
		.then((user: any) => {
			res.status(200).send({
				error: false,
				message: translate('user.admin.register.success', req),
				data: {
					created_at: user.createdAt,
					email: user['email'],
					id: user['_id'],
					role: user['role'],
					status: user['status'],
					task_order: user['task_order'],
					username: user['username'],
					verified: user['verified'],
					last_active: user['last_active']
				}
			})
		})
		.catch((err: any) => {
			if (err.code == 11000) {
				if (err.message.includes('username')) {
					res.status(400).send({
						error: true,
						message: translate('user.login.username.invalid', req)
					})
				} else {
					res.status(400).send({
						error: true,
						message: translate('user.login.email.invalid', req)
					})
				}
			} else {
				res.status(400).send({
					error: true,
					message: err.message || translate('user.add.error', req)
				})
			}
		})
}

export const userListAll = (req: any, res: any) => {
	User.find()
		.select('-password -updatedAt -__v')
		.then((user: any) => {
			res.status(200).send({
				error: false,
				message: translate('user.retrieved.list.success', req),
				data: user
			})
		})
		.catch((err: any) => {
			res.status(400).send({
				error: true,
				message: err.message || translate('user.retrieved.list.error', req)
			})
		})
}

export const userListFiltered = (req: any, res: any) => {
	const page = parseInt(req.query.page)
	const limit = parseInt(req.query.limit)
	const sortList = { createdAt: -1 }

	const verified = Boolean(parseInt(req.query.verified))
	const issues = Boolean(parseInt(req.query.issues))

	let filterRole: any = {}
	let filterQuery: any = {}

	if (req.query.role) {
		let roleValue = req.query.role
		let roleValueArray: Array<any> = []

		if (roleValue.includes(',')) {
			roleValue.split(',').forEach(function (value: any) {
				roleValueArray.push(value)
			})
			filterRole = { role: roleValueArray }
		} else {
			roleValueArray = [roleValue]
			filterRole = { role: roleValueArray }
		}
	}

	if (req.query.search) {
		filterQuery = {
			$and: [
				{
					$or: [
						{ first_name: { $regex: req.query.search, $options: 'i' } },
						{ last_name: { $regex: req.query.search, $options: 'i' } },
						{ email: { $regex: req.query.search, $options: 'i' } },
						{ username: { $regex: req.query.search, $options: 'i' } }
					]
				},
				filterRole
			]
		}
	} else {
		filterQuery = {
			$and: [filterRole]
		}
	}

	if (req.query.verified !== 'all') {
		filterQuery.$and.push({ verified })
	}

	if (req.query.issues !== 'all') {
		filterQuery.$and.push({ issues })
	}

	if (page < 0 || page === 0) {
		const response = {
			error: true,
			message: translate('common.invalid.page.number', req)
		}
		return res.json(response)
	}

	User.countDocuments(filterQuery)
		.then((totalCount: any) => {
			var totalPages = Math.ceil(totalCount / limit)
			var skipValue = limit * (page - 1)

			User.find(filterQuery)
				.select('-password -updatedAt -__v')
				.limit(limit)
				.skip(skipValue)
				.sort(sortList)
				.then((data: any) => {
					res.status(200).send({
						error: false,
						message: translate('user.retrieved.list.success', req),
						data: {
							pages: totalPages,
							count: totalCount,
							currentPage: page,
							data
						}
					})
				})
				.catch((err: any) => {
					res.status(400).send({
						error: true,
						message: err.message || translate('user.retrieved.list.error', req)
					})
				})
		})
		.catch((err: any) => {
			res.status(400).send({
				error: true,
				message: err.message || translate('user.retrieved.list.error', req)
			})
		})
}

export const userReports = async (req: any, res: any) => {
	const user = await User.findById(req.userId)

	if (!user) {
		res.status(400).send({
			error: true,
			message: translate('audit.shareReport.user.not.found', req)
		})
	}

	if (user?.role !== 1) {
		res.status(400).send({
			error: true,
			message: translate('user.reports.not.admin', req)
		})
	}

	try {
		const regularUsers = await User.countDocuments({ role: 2 })
		const subscribeUsers = await User.countDocuments({ subscribed: true })
		const totalUsers = await User.countDocuments({})
		const verifiedUsers = await User.countDocuments({ verified: true })
		const issues = await User.countDocuments({ issues: true })

		res.status(200).send({
			error: false,
			message: translate('user.reports.retrieved.success', req),
			data: {
				regularUsers,
				subscribeUsers,
				totalUsers,
				verifiedUsers,
				issues
			}
		})
	} catch (error: any) {
		res.status(400).send({
			error: true,
			message: error.message
		})
	}
}

export const userDetails = (req: any, res: any) => {
	User.findById(req.params.id)
		.select('-password -updatedAt -__v')
		.then((user: any) => {
			if (!user) {
				return res.status(400).send({
					error: true,
					message: translate('user.not.found', req)
				})
			}

			res.status(200).send({
				error: false,
				message: translate('user.retrieved.details.success', req),
				data: {
					accept_cookies: user.accept_cookies,
					created_at: user.createdAt,
					email: user.email,
					first_name: user.first_name,
					id: user._id,
					language: user.language,
					last_name: user.last_name,
					role: user.role,
					status: user.status,
					target_score: user.target_score,
					task_order: user.task_order,
					theme: user.theme,
					username: user.username,
					verified: user.verified,
					image_url: user.image_url,
					issues: user.issues
				}
			})
		})
		.catch((err: any) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('user.not.found', req)
				})
			}
			return res.status(400).send({
				error: true,
				message: translate('user.retrieving.details.error', req)
			})
		})
}

export const userProfile = (req: any, res: any) => {
	User.findById(req.userId)
		.select('-password -updatedAt -__v')
		.then((user: any) => {
			if (!user) {
				return res.status(400).send({
					error: true,
					message: translate('user.not.found ', req)
				})
			}

			res.status(200).send({
				error: false,
				message: translate('user.retrieved.profile.success', req),
				token: req.currentToken,
				data: {
					accept_cookies: user.accept_cookies,
					created_at: user.createdAt,
					email: user.email,
					first_name: user.first_name,
					id: user._id,
					image_url: user.image_url,
					is_6s: user.is_6s,
					language: user.language,
					last_name: user.last_name,
					role: user.role,
					status: user.status,
					target_score: user.target_score,
					task_order: user.task_order,
					tester: user.tester,
					theme: user.theme,
					username: user.username,
					verified: user.verified,
					issues: user.issues
				}
			})
		})
		.catch((err: any) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('user.not.found', req)
				})
			}
			return res.status(400).send({
				error: true,
				message: translate('user.retrieving.details.error', req)
			})
		})
}

export const userUpdate = async (req: any, res: any) => {
	try {
		const email = String(req.body.email).toLowerCase()
		const user = await User.findById(req.params.id)
		if (!user) {
			return res.status(400).send({
				error: true,
				message: translate('user.find.no', req)
			})
		}

		if (req.body.new_password) {
			if (req.userRole !== 1) {
				var passwordIsValid = bcrypt.compareSync(req.body.current_password, user.password)

				if (!passwordIsValid) {
					return res.status(400).send({
						error: true,
						message: translate('user.update.password.invalid', req)
					})
				}
			}

			if (req.body.new_password.length <= 7) {
				return res.status(400).send({
					error: true,
					message: translate('user.userRegister.password.invalid', req)
				})
			}

			let hashedPassword = bcrypt.hashSync(req.body.new_password, 8)

			let updateObj = {
				accept_cookies: req.body.accept_cookies,
				email,
				first_name: req.body.first_name,
				is_6s: req.body.is_6s,
				language: req.body.language,
				last_name: req.body.last_name,
				last_active: new Date(),
				password: hashedPassword,
				role: req.body.role,
				status: req.body.status,
				target_score: req.body.target_score,
				task_order: req.body.task_order,
				tester: req.body.tester,
				theme: req.body.theme,
				username: req.body.username,
				verified: req.body.verified,
				issues: req.body.issues
			}

			if (email && email !== String(user.email).toLowerCase()) {
				updateObj.verified = false
			}

			updatedUserData(req, res, updateObj)
		} else {
			let updateObj = {
				accept_cookies: req.body.accept_cookies,
				email,
				first_name: req.body.first_name,
				is_6s: req.body.is_6s,
				language: req.body.language,
				last_name: req.body.last_name,
				last_active: new Date(),
				role: req.body.role,
				status: req.body.status,
				target_score: req.body.target_score,
				task_order: req.body.task_order,
				tester: req.body.tester,
				theme: req.body.theme,
				username: req.body.username,
				verified: req.body.verified,
				issues: req.body.issues
			}

			updatedUserData(req, res, updateObj)
		}
	} catch (err: any) {
		if (err.code == 11000) {
			if (err.message.includes('username')) {
				res.status(400).send({
					error: true,
					message: translate('user.login.username.invalid', req)
				})
			} else {
				res.status(400).send({
					error: true,
					message: translate('user.login.email.invalid', req)
				})
			}
		} else {
			res.status(400).send({
				error: true,
				message: err.message || translate('user.add.error', req)
			})
		}
	}
}

export const userDownloadData = async (req: Request, res: Response) => {
	if (req.userRole !== 1 && req.userId !== req.params.id) {
		return res.status(400).send({
			error: true,
			message: 'Unauthorized. Need admin permission.'
		})
	}

	try {
		var zip = new AdmZip()
		const filename = Date.now()

		const areas = await Area.find({ created_by: req.params.id })
		const tasks = await Task.find({ created_by: req.params.id })
		const audits = await Audit.find({ created_by: req.params.id }).populate('scores')

		const areaImages = map(
			filter(
				areas,
				(area) =>
					area.image !== 'office' &&
					area.image !== 'production' &&
					area.image !== 'laboratory' &&
					Boolean(area.image)
			),
			(task) => task.image
		)

		const taskImages = map(
			filter(tasks, (task) => Boolean(task.image)),
			(task) => task.image
		)

		const auditImages = flatMap(
			map(audits, (audit) => {
				return map(
					filter(audit.scores, (score) => Boolean(score.image)),
					(score) => score.image
				)
			})
		)

		const data = {
			areas,
			tasks,
			audits,
			areaImages,
			taskImages,
			auditImages
		}

		const publicDir = `${path.join(process.cwd(), '/public')}`
		const dir = `${publicDir}/data`

		each(areaImages, (image) => {
			if (existsSync(`${publicDir}/images/area/${image}`)) {
				zip.addLocalFile(`${publicDir}/images/area/${image}`, 'images/areas')
			}
		})

		each(taskImages, (image) => {
			if (existsSync(`${publicDir}/images/task/${image}`)) {
				zip.addLocalFile(`${publicDir}/images/task/${image}`, 'images/tasks')
			}
		})

		each(auditImages, (image) => {
			if (existsSync(`${publicDir}/images/audit/${image}`)) {
				zip.addLocalFile(`${publicDir}/images/audit/${image}`, 'images/audits')
			}
		})

		zip.addFile(`${filename}.json`, Buffer.from(JSON.stringify(data), 'utf8'))
		// const fileContent = zip.toBuffer()

		// res.writeHead(200, {
		// 	'Content-Disposition': `attachment; filename="${req.userId}.${Date.now()}.zip"`,
		// 	'Content-Type': 'application/zip'
		// })
		// return res.end(fileContent)
		// return res.status(200).send({
		// 	error: false,
		// 	message: 'data compiled successfully',
		// 	data
		// })
		zip.writeZip(`${dir}/${req.userId}.${filename}.zip`, (error: any) => {
			if (error) {
				return res.status(400).send({
					error: true,
					message: `error generating json file: ${error}`
				})
			} else {
				return res.status(200).send({
					error: false,
					message: 'data compiled successfully',
					data: {
						...data,
						file: `${req.userId}.${filename}.zip`
					}
				})
			}
		})
	} catch (error: any) {
		if (error.kind === 'ObjectId' || error.name === 'NotFound') {
			return res.status(400).send({
				error: true,
				message: 'User not found with id ' + req.params.id
			})
		}

		return res.status(400).send({
			error: true,
			message: 'Could not download data' + error
		})
	}
}

export const userDelete = async (req: any, res: any) => {
	if (req.userRole !== 1 && req.userId !== req.params.id) {
		return res.status(400).send({
			error: true,
			message: 'Unauthorized. Need admin permission.'
		})
	}
	try {
		const user = await User.findByIdAndRemove<UserType>(req.params.id)

		if (!user) {
			return res.status(400).send({
				error: true,
				message: 'User not found with id ' + req.params.id
			})
		}

		await Area.deleteMany({ created_by: req.params.id })
		await Task.deleteMany({ created_by: req.params.id })
		await Audit.deleteMany({ created_by: req.params.id })

		res.status(200).send({
			error: false,
			message: 'User successfully deleted!'
		})
	} catch (err: any) {
		if (err.kind === 'ObjectId' || err.name === 'NotFound') {
			return res.status(400).send({
				error: true,
				message: 'User not found with id ' + req.params.id
			})
		}
		return res.status(400).send({
			error: true,
			message: 'Could not delete user with id ' + req.params.id
		})
	}
}

export const userUpdateStatus = (req: any, res: any) => {
	if (!String(req.body.status)) {
		return res.status(400).send({
			error: true,
			message: translate('Status can not be empty', req)
		})
	}

	User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
		.then((user: any) => {
			if (!user) {
				return res.status(400).send({
					error: true,
					message: translate('user.not.found', req)
				})
			}

			res.status(200).send({
				error: false,
				message: translate('user.update.status.success', req),
				data: {
					accept_cookies: user.accept_cookies,
					email: user.email,
					first_name: user.first_name,
					is_6s: req.body.is_6s,
					id: user._id,
					language: user.language,
					last_name: user.last_name,
					last_active: user.last_active,
					role: user.role,
					status: user.status,
					target_score: user.target_score,
					task_order: user.task_order,
					tester: req.body.tester,
					theme: user.theme,
					username: user.username,
					verified: user.verified,
					issues: user.issues
				}
			})
		})
		.catch((err: any) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('user.not.found', req)
				})
			}
			return res.status(400).send({
				error: true,
				message: translate('user.update.error', req)
			})
		})
}

export const userUploadImage = (req: any, res: any) => {
	if (req.file != null) {
		res.status(400).send({
			error: true,
			message: translate('common.upload.image.noImage', req)
		})
	}

	upload(req, res, (error: any) => {
		const filename = req.file.filename
		if (error) {
			res.send({
				error: true,
				message: translate('common.upload.image.error', req),
				data: error
			})
		}

		let image_url = `${bucket}${filename}`
		let updatedData = {
			image_url: image_url
		}

		profileUpdatedUserData(req, res, updatedData)
	})
}

export const userProfileUpdate = async (req: any, res: any) => {
	try {
		const user = await User.findById(req.userId)
		if (!user) {
			return res.status(400).send({
				error: true,
				message: translate('user.find.no', req)
			})
		}

		if (!req.body.current_password) {
			let updateObj = {
				accept_cookies: req.body.accept_cookies,
				email: req.body.email,
				is_6s: req.body.is_6s,
				first_name: req.body.first_name,
				language: req.body.language,
				last_name: req.body.last_name,
				subscription: req.body.subscription,
				target_score: req.body.target_score,
				task_order: req.body.task_order,
				theme: req.body.theme,
				username: req.body.username,
				verified: user.verified,
				issues: req.body.issues
			}
			if (req.body.email && req.body.email !== user.email) {
				updateObj.verified = false
			}
			profileUpdatedUserData(req, res, updateObj)
		} else {
			var passwordIsValid = bcrypt.compareSync(req.body.current_password, user.password)

			if (!passwordIsValid) {
				return res.status(400).send({
					error: true,
					message: translate('user.update.password.invalid', req)
				})
			}

			if (req.body.new_password.length <= 7) {
				return res.status(400).send({
					error: true,
					message: translate('user.userRegister.password.invalid', req)
				})
			}

			let hashedPassword = bcrypt.hashSync(req.body.new_password, 8)

			let updateObj = {
				accept_cookies: req.body.accept_cookies,
				email: req.body.email,
				is_6s: req.body.is_6s,
				first_name: req.body.first_name,
				language: req.body.language,
				last_name: req.body.last_name,
				password: hashedPassword,
				subscription: req.body.subscription,
				target_score: req.body.target_score,
				task_order: req.body.task_order,
				theme: req.body.theme,
				username: req.body.username,
				verified: user.verified
			}
			if (req.body.email && req.body.email !== user.email) {
				updateObj.verified = false
			}
			profileUpdatedUserData(req, res, updateObj)
		}
	} catch (err: any) {
		if (err.code == 11000) {
			if (err.message.includes('username')) {
				res.status(400).send({
					error: true,
					message: translate('user.login.username.invalid', req)
				})
			} else {
				res.status(400).send({
					error: true,
					message: translate('user.login.email.invalid', req)
				})
			}
		} else {
			res.status(400).send({
				error: true,
				message: err.message || translate('user.add.error', req)
			})
		}
	}
}

export const userVerifyAccount = (req: any, res: any) => {
	User.findOne({
		userToken: req.params.token,
		userTokenExpires: { $gt: Date.now() }
	}).then((user) => {
		if (!user)
			return res.status(400).send({
				error: true,
				message: translate('user.verify.token.invalid', req)
			})

		user.verified = true

		user.userToken = undefined
		user.userTokenExpires = undefined

		user.save((err) => {
			if (err) {
				return res.status(400).send({ error: true, message: err.message })
			}

			return res.status(200).send({
				error: false,
				isVerified: true,
				message: translate('user.update.success', req)
			})
		})
	})
}

export const recoverAccount = (req: any, res: any) => {
	if (!req.body.email) {
		return res.status(400).send({
			error: true,
			message: translate('contact.email.empty', req)
		})
	}

	sgMail.setApiKey(`${process.env.SENDGRID_API_KEY}`)

	User.findOne({ email: req.body.email })
		.then((user) => {
			if (!user)
				return res.status(400).send({
					error: true,
					message: translate(`user.recoverAccount.error`, req)
				})

			user.generateToken()
			user
				.save()
				.then((user) => {
					const mailOptions: sgMail.MailDataRequired = {
						from: {
							name: 'GoLeanSigma Team',
							email: `${process.env.SENDGRID_FROM_EMAIL}`
						},
						personalizations: [
							{
								to: [
									{
										email: user.email
									}
								],
								dynamicTemplateData: {
									firstname: user.first_name,
									link: `${process.env.APP_HOST}reset-password/${user.userToken}`,
									token: user.userToken
								}
							}
						],
						templateId: `${
							user.language === 'en'
								? process.env.SENDGRID_EN_RESET_PASSWORD_TEMPLATE_ID
								: process.env.SENDGRID_RESET_PASSWORD_TEMPLATE_ID
						}`
					}

					sgMail.send(mailOptions, false, (error: any, result: any) => {
						if (error) {
							return res.status(400).send({ error: true, message: error.message })
						}
						res.status(200).send({
							error: false,
							message: translate(`user.email.resent`, req)
						})
					})
				})
				.catch((err) => {
					return res.status(400).send({ error: true, message: err.message })
				})
		})
		.catch((err) => {
			return res.status(400).send({ error: true, message: err.message })
		})
}

export const validateToken = (req: any, res: any) => {
	User.findOne({
		userToken: req.params.token,
		userTokenExpires: { $gt: Date.now() }
	})
		.then((user) => {
			if (isNil(user)) {
				return res
					.status(400)
					.send({ message: translate('user.verify.token.invalid', req) })
			}

			res.status(200).send({ error: false, isValid: true, token: req.params.token })
		})
		.catch((err) => {
			console.error('error', err)
			return res.status(400).send({ error: true, message: err.message })
		})
}

export const resetPassword = (req: any, res: any) => {
	sgMail.setApiKey(`${process.env.SENDGRID_API_KEY}`)

	User.findOne({
		userToken: req.params.token,
		userTokenExpires: { $gt: Date.now() }
	}).then((user) => {
		if (!user)
			return res
				.status(400)
				.send({ message: translate('user.token.exoired.invalid', req) })

		const hashedPassword = bcrypt.hashSync(req.body.password, 8)
		user.password = hashedPassword

		user.userToken = undefined
		user.userTokenExpires = undefined

		user.save((err) => {
			if (err) {
				return res.status(400).send({ error: true, message: err.message })
			}

			const mailOptions = {
				from: {
					name: 'GoLeanSigma Team',
					email: `${process.env.SENDGRID_FROM_EMAIL}`
				},
				personalizations: [
					{
						to: [
							{
								email: user.email
							}
						],
						dynamicTemplateData: {
							firstname: user.first_name
						}
					}
				],
				templateId: `${
					user.language === 'en'
						? process.env.SENDGRID_EN_RESET_PASSWORD_SUCCESS_TEMPLATE_ID
						: process.env.SENDGRID_RESET_PASSWORD_SUCCESS_TEMPLATE_ID
				}`
			}

			sgMail.send(mailOptions, false, (error: any, result: any) => {
				if (error) return res.status(400).send({ error: true, message: error.message })

				res.status(200).send({ message: translate('user.update.password.success', req) })
			})
		})
	})
}

const updatedUserData = async (req: any, res: any, updatedData: any) => {
	try {
		const user = await User.findByIdAndUpdate(req.params.id, updatedData, { new: true })
		if (!user) {
			return res.status(400).send({
				error: true,
				message: translate('user.not.found', req)
			})
		}

		res.status(200).send({
			error: false,
			message: translate('user.update.details.success', req),
			data: {
				accept_cookies: user.accept_cookies,
				created_at: user.createdAt,
				email: user.email,
				is_6s: req.body.is_6s,
				first_name: user.first_name,
				id: user._id,
				language: user.language,
				last_name: user.last_name,
				last_active: new Date(),
				role: user.role,
				status: user.status,
				target_score: user.target_score,
				task_order: user.task_order,
				theme: user.theme,
				username: user.username,
				verified: user.verified,
				issues: user.issues
			}
		})
	} catch (err: any) {
		if (err.kind === 'ObjectId') {
			return res.status(400).send({
				error: true,
				message: translate('user.not.found', req)
			})
		}
		return res.status(400).send({
			error: true,
			message: translate('user.update.error', req)
		})
	}
}

const profileUpdatedUserData = async (req: any, res: any, updatedData: any) => {
	try {
		const user = await User.findByIdAndUpdate(req.userId, updatedData, { new: true })
		if (!user) {
			return res.status(400).send({
				error: true,
				message: translate(`user.not.found ${req.params.id}`, req)
			})
		}

		res.status(200).send({
			error: false,
			message: translate('user.update.profile.success', req),
			data: {
				accept_cookies: user.accept_cookies,
				created_at: user.createdAt,
				email: user.email,
				is_6s: req.body.is_6s,
				first_name: user.first_name,
				id: user._id,
				language: user.language,
				last_name: user.last_name,
				last_active: user.last_active,
				role: user.role,
				status: user.status,
				subscription: req.body.subscription,
				target_score: user.target_score,
				task_order: user.task_order,
				theme: user.theme,
				username: user.username,
				verified: user.verified,
				image_url: user.image_url,
				tester: user.tester,
				issues: user.issues
			}
		})
	} catch (err: any) {
		if (err.kind === 'ObjectId') {
			return res.status(400).send({
				error: true,
				message: translate('user.not.found', req)
			})
		}
		return res.status(400).send({
			error: true,
			message: translate('user.update.error', req)
		})
	}
}

export const userResendVerification = async (req: any, res: any, cb?: () => void) => {
	sgMail.setApiKey(`${process.env.SENDGRID_API_KEY}`)

	const email = String(req.body.email).toLowerCase()
	try {
		const foundUser = await User.findOne({ email })
		if (foundUser) {
			foundUser.generateToken()
			const updatedFoundUser = await foundUser.save()
			const mailOptions: sgMail.MailDataRequired = {
				from: {
					name: 'GoLeanSigma Team',
					email: `${process.env.SENDGRID_FROM_EMAIL}`
				},
				personalizations: [
					{
						to: [
							{
								email: updatedFoundUser.email
							}
						],
						dynamicTemplateData: {
							link: `${process.env.APP_HOST}verify/${updatedFoundUser.userToken}`,
							token: updatedFoundUser.userToken
						}
					}
				],
				templateId: `${
					foundUser.language === 'en'
						? process.env.SENDGRID_EN_VERIFY_ACCOUNT_TEMPLATE_ID
						: process.env.SENDGRID_VERIFY_ACCOUNT_TEMPLATE_ID
				}`
			}

			await sgMail.send(mailOptions, false)
			return res.status(200).send({
				error: true,
				message: `Verification sent. Please check your email inbox.`
			})
		}
	} catch (error: any) {
		return res.status(400).send({ error: true, message: `mail error: ${error.message}` })
	}
}

export const sendDeactivationEmail = async () => {
	const toNotifyDate = new Date()
	toNotifyDate.setDate(toNotifyDate.getDate() - 20)
	const toDeleteDate = new Date()
	toDeleteDate.setDate(toDeleteDate.getDate() - 30)

	const usersToNotify = await User.find({ last_active: { $lte: toNotifyDate } })
	const usersToDelete = await User.find({ last_active: { $lte: toDeleteDate } })
}

const userSendVerification = async (req: any, res: any, cb?: () => void) => {
	sgMail.setApiKey(`${process.env.SENDGRID_API_KEY}`)

	const email = String(req.body.email).toLowerCase()
	try {
		const foundUser = await User.findOne({ email })
		if (foundUser) {
			foundUser.generateToken()
			const updatedFoundUser = await foundUser.save()
			const mailOptions: sgMail.MailDataRequired = {
				from: {
					name: 'GoLeanSigma Team',
					email: `${process.env.SENDGRID_FROM_EMAIL}`
				},
				personalizations: [
					{
						to: [
							{
								email: updatedFoundUser.email
							}
						],
						dynamicTemplateData: {
							link: `${process.env.APP_HOST}verify/${updatedFoundUser.userToken}`,
							token: updatedFoundUser.userToken
						}
					}
				],
				templateId: `${process.env.SENDGRID_VERIFY_ACCOUNT_TEMPLATE_ID}`
			}

			await sgMail.send(mailOptions, false)

			if (!isNil(cb)) {
				return cb()
			}
		}
	} catch (error: any) {
		return res.status(400).send({ error: true, message: `mail error: ${error.message}` })
	}
}
