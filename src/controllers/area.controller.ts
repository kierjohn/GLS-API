import Activity from '../models/activity.model'
import Area from '../models/area.model'
import Audit from '../models/audit.model'
import User from '../models/user.model'

import { isNil } from 'lodash'
import multer from 'multer'
import { translate } from '../utils/helpers'

const storageEngine = multer.diskStorage({
	destination: (req: any, file: any, callback: any) => {
		callback(null, './public/images/area/')
	},
	filename: (req: any, file: any, callback: any) => {
		const extArray = file.mimetype.split('/')
		const extension = extArray[extArray.length - 1]

		callback(null, `${Date.now()}.${extension}`)
	}
})

const upload = multer({
	storage: storageEngine
}).single('image')

export const areaAdd = async (req: any, res: any) => {
	try {
		const currentUser = await User.findById(req.userId).exec()

		if (!currentUser?.tester && !currentUser?.verified) {
			return res.status(400).send({
				error: true,
				message: translate('area.add.unverified', req)
			})
		}
	} catch (error: any) {
		return res.status(400).send({
			error: true,
			message: error.message
		})
	}

	if (!req.body.title) {
		return res.status(400).send({
			error: true,
			message: translate('common.title.empty', req)
		})
	}
	if (!req.body.type) {
		return res.status(400).send({
			error: true,
			message: translate('area.add.type.empty', req)
		})
	}

	if (!req.body.location) {
		return res.status(400).send({
			error: true,
			message: translate('common.area.add.location.empty', req)
		})
	}

	var areaObj = {
		title: req.body.title,
		type: req.body.type,
		location: req.body.location,
		description: req.body.description,
		status: 1,
		created_by: req.userId,
		image: req.body.image
	}

	let foundArea = await Area.find({ created_by: req.userId, title: areaObj.title }).exec()

	if (foundArea.length != 0) {
		return res.status(400).send({
			data: foundArea,
			error: true,
			message: translate('area.add.title.exist', req)
		})
	}

	const area = new Area(areaObj)

	area
		.save()
		.then((areaResult) => {
			let activityObj = {
				objectId: areaResult._id,
				title: req.body.title,
				type: 'NEW_AREA',
				description: req.body.description,
				created_by: req.userId
			}

			const activity = new Activity(activityObj)
			activity.save()

			res.status(200).send({
				error: false,
				message: translate('common.area.add.success', req),
				data: areaResult
			})
		})
		.catch((err) => {
			if (err && err.code === 11000) {
				return res.status(400).send({
					error: true,
					message: translate('area.add.title.exist', req)
				})
			}

			res.status(400).send({
				error: true,
				message: err.message || translate('area.add.error', req)
			})
		})
}

export const areaListAll = (req: any, res: any) => {
	let filterQuery: any = {}

	if (req.userRole == 2 || req.userRole == 1) {
		filterQuery.created_by = req.query.userId ? req.query.userId : req.userId
	}

	Area.find(filterQuery)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username'
		})
		.populate('location')
		.then((areaResults) => {
			res.status(200).send({
				error: false,
				message: translate('area.list.all.success', req),
				data: areaResults
			})
		})
		.catch((err) => {
			res.status(400).send({
				error: true,
				message: err.message || translate('area.list.all.error', req)
			})
		})
}

export const areaListFiltered = (req: any, res: any) => {
	const page = parseInt(req.query.page)
	const limit = parseInt(req.query.limit)
	const type = req.query.type

	let status: number | Array<number> = 1
	let sortList = {}

	if (req.query.status) {
		if (req.query.status != 'all') {
			status = req.query.status
		} else {
			status = [0, 1]
		}
	}

	let filterQuery: any = {}

	if (req.query.search) {
		filterQuery = {
			$and: [
				{
					$or: [
						{ description: { $regex: '.*' + req.query.search + '.*', $options: 'i' } },
						{ title: { $regex: '.*' + req.query.search + '.*', $options: 'i' } }
					]
				},
				{ status: status }
			]
		}

		if (req.userRole == 2 || req.userRole == 1) {
			filterQuery = {
				$and: [
					{
						$or: [
							{ description: { $regex: '.*' + req.query.search + '.*', $options: 'i' } },
							{ title: { $regex: '.*' + req.query.search + '.*', $options: 'i' } }
						]
					},
					{ status: status },
					{ created_by: req.userId }
				]
			}
		}
	} else {
		filterQuery = {
			status: status
		}

		if (req.userRole == 2 || req.userRole == 1) {
			filterQuery = {
				$and: [{ status: status }, { created_by: req.userId }]
			}

			if (req.query.type) {
				filterQuery = {
					$and: [{ status: status }, { created_by: req.userId }, { type: req.query.type }]
				}
			}
		}
	}

	if (page < 0 || page === 0) {
		const response = {
			error: true,
			message: translate('common.invalid.page.number', req)
		}
		return res.json(response)
	}

	if (req.query.sort) {
		let sort = req.query.sort
		let order = 1

		if (req.query.order) {
			order = req.query.order == 'asc' ? 1 : -1
		}

		sortList = { [sort]: order }
	} else {
		sortList = { ['createdAt']: 'desc' }
	}

	Area.countDocuments(filterQuery)
		.then((totalCount) => {
			var totalPages = Math.ceil(totalCount / limit)
			var skipValue = limit * (page - 1)

			Area.find(filterQuery)
				.select('-updatedAt -__v')
				.populate({
					path: 'created_by',
					match: { status: 1 },
					select: '_id first_name last_name email username'
				})
				.populate('location')
				.limit(limit)
				.skip(skipValue)
				.sort(sortList)
				.then((areaResults) => {
					res.status(200).send({
						error: false,
						message: translate('area.list.all.success', req),
						data: {
							pages: totalPages,
							count: totalCount,
							currentPage: page,
							data: areaResults
						}
					})
				})
				.catch((err) => {
					res.status(400).send({
						error: true,
						message: err.message || translate('area.list.all.error', req)
					})
				})
		})
		.catch((err) => {
			res.status(400).send({
				error: true,
				message: err.message || translate('area.list.all.error', req)
			})
		})
}

export const areaDetails = (req: any, res: any) => {
	Area.findById(req.params.id)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username'
		})
		.populate('location')
		.then((areaResult) => {
			if (!areaResult) {
				return res.status(400).send({
					error: true,
					message: translate('area.details.not,found', req)
				})
			}
			res.status(200).send({
				error: false,
				message: translate('area.details.success', req),
				data: areaResult
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('area.details.not,found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('area.details.error', req)
			})
		})
}

export const areaUpdate = async (req: any, res: any) => {
	let areaUpdate: any = {}

	if (req.body.title) {
		areaUpdate.title = req.body.title
	}

	if (req.body.type) {
		areaUpdate.type = req.body.type
	}

	if (req.body.location) {
		areaUpdate.location = req.body.location
	}

	if (req.body.image) {
		areaUpdate.image = req.body.image
	}

	if (req.body.status) {
		areaUpdate.status = req.body.status
	}

	areaUpdate.description = req.body.description

	let foundArea = await Area.findOne({
		created_by: req.userId,
		title: req.body.title
	}).exec()

	if (!isNil(foundArea) && foundArea?._id?.toString() !== req.params.id) {
		return res.status(400).send({
			data: foundArea,
			error: true,
			message: translate('Area title already exists.', req)
		})
	}

	Area.findByIdAndUpdate(req.params.id, areaUpdate, { new: true })
		.select('-updatedAt -__v')
		.then((areaResult) => {
			if (!areaResult) {
				return res.status(400).send({
					error: true,
					message: translate('Areas not found with id ' + req.params.id, req)
				})
			} else {
				let activityObj = {
					objectId: areaResult._id,
					title: req.body.title,
					type: 'UPDATE_AREA',
					description: req.body.description,
					created_by: req.userId
				}

				const activity = new Activity(activityObj)
				activity.save()

				res.status(200).send({
					error: false,
					message: translate('area.details.update.success', req),
					data: areaResult
				})
			}
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('Areas not found with id ' + req.params.id, req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('Error updating areaResult with id ' + req.params.id, req)
			})
		})
}

export const areaUpdateStatus = (req: any, res: any) => {
	if (!String(req.body.status)) {
		return res.status(400).send({
			error: true,
			message: translate('common.update.status.empty', req)
		})
	}

	Area.findByIdAndUpdate(
		req.params.id,
		{
			status: req.body.status
		},
		{ new: true }
	)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username'
		})
		.then((areaResult) => {
			if (!areaResult) {
				return res.status(400).send({
					error: true,
					message: translate('Areas not found with id ' + req.params.id, req)
				})
			}

			res.status(200).send({
				error: false,
				message: translate('area.update.status.success', req),
				data: areaResult
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('Area not found with id ' + req.params.id, req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('Error updating areaResult with id ' + req.params.id, req)
			})
		})
}

export const areaDelete = (req: any, res: any) => {
	Audit.findOne({ area: req.params.id })
		.select('-_id -__v -scores -status -created_by -createdAt -updatedAt')
		.then((auditResult) => {
			if (auditResult) {
				return res.status(400).send({
					error: true,
					message: translate('area.delete.existing.audit', req)
				})
			}

			Area.findByIdAndRemove(req.params.id)
				.select('-updatedAt -__v')
				.populate({
					path: 'created_by',
					match: { status: 1 },
					select: '_id email username'
				})
				.then((areaResult) => {
					if (!areaResult) {
						return res.status(400).send({
							error: true,
							message: translate('Areas not found with id ' + req.params.id, req)
						})
					}

					let activityObj = {
						objectId: areaResult._id,
						title: areaResult.title,
						type: 'DELETE_AREA',
						description: areaResult.description,
						created_by: areaResult.created_by
					}

					const activity = new Activity(activityObj)
					activity.save()

					res.status(200).send({
						error: false,
						message: translate('area.delete.success', req)
					})
				})
				.catch((err) => {
					if (err.kind === 'ObjectId' || err.name === 'NotFound') {
						return res.status(400).send({
							error: true,
							message: translate('Area not found with id ' + req.params.id, req)
						})
					}

					return res.status(400).send({
						error: true,
						message: translate('audit.list.filtered.area.with.id.not.found', req)
					})
				})
		})
		.catch((err) => {
			return res.status(400).send({
				error: true,
				message: translate('audit.list.filtered.area.with.id.not.found', req)
			})
		})
}

export const areaSeed = (req: any, res: any) => {
	res.send('seed removed')
}

export const areaUploadImage = (req: any, res: any) => {
	if (req.file != null) {
		res.status(400).send({
			error: true,
			message: translate('common.upload.image.noImage', req)
		})
	}

	upload(req, res, (error) => {
		const filename = req.file.filename
		if (error) {
			res.send({
				error: true,
				message: translate('common.upload.image.error', req),
				data: error
			})
		}

		res.send({
			error: false,
			message: translate('area.upload.image.success', req),
			data: filename
		})
	})
}
