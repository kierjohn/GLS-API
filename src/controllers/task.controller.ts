import { Request, Response } from 'express'
import moment from 'moment'
import multer from 'multer'

import Activity from '../models/activity.model'
import Task from '../models/task.model'
import User from '../models/user.model'
import { translate } from '../utils/helpers'

const storageEngine = multer.diskStorage({
	destination: (
		req: Request,
		file: Express.Multer.File,
		callback: (p: null, destination: string) => void
	) => {
		callback(null, './public/images/task/')
	},
	filename: (
		req: Request,
		file: Express.Multer.File,
		callback: (p: null, destination: string) => void
	) => {
		const extArray = file.mimetype.split('/')
		const extension = extArray[extArray.length - 1]

		callback(null, `${Date.now()}.${extension}`)
	}
})

const upload = multer({
	storage: storageEngine
}).single('image')

export const taskAdd = (req: Request, res: Response) => {
	if (!req.body.audit) {
		return res.status(400).send({
			error: true,
			message: translate('task.storageEngine.audit.empty', req)
		})
	}

	if (!req.body.task) {
		return res.status(400).send({
			error: true,
			message: translate('task.storageEngine.task.empty', req)
		})
	}

	if (!req.body.due_date) {
		return res.status(400).send({
			error: true,
			message: translate('task.storageEngine.dueDate.empty', req)
		})
	}

	if (!req.body.location) {
		return res.status(400).send({
			error: true,
			message: translate('area.add.location.empty', req)
		})
	}

	if (!req.body.area) {
		return res.status(400).send({
			error: true,
			message: translate('common.audit.add.area.empty', req)
		})
	}

	if (!req.body.priority) {
		return res.status(400).send({
			error: true,
			message: translate('category.add.priority.empty', req)
		})
	}

	if (!req.body.task_status) {
		return res.status(400).send({
			error: true,
			message: translate('task.storageEngine.task.status.empty', req)
		})
	}

	if (!req.body.assigned) {
		return res.status(400).send({
			error: true,
			message: translate('task.storageEngine.assigned.empty', req)
		})
	}

	if (!req.body.description) {
		return res.status(400).send({
			error: true,
			message: translate('task.storageEngine.description.empty', req)
		})
	}

	var taskObj = {
		audit: req.body.audit,
		task: req.body.task,
		due_date: req.body.due_date,
		location: req.body.location,
		area: req.body.area,
		priority: req.body.priority,
		task_status: req.body.task_status,
		assigned: req.body.assigned,
		description: req.body.description,
		status: 1,
		created_by: req.userId,
		image: req.body.image
	}

	const task = new Task(taskObj)

	task
		.save()
		.then((taskResult) => {
			let activityObj = {
				objectId: taskResult._id,
				title: req.body.task,
				type: 'NEW_TASK',
				description: req.body.description,
				created_by: req.userId
			}

			const activity = new Activity(activityObj)
			activity.save()

			User.findByIdAndUpdate(req.userId, {
				$push: { task_order: taskResult._id.toString() }
			}).exec()

			res.status(200).send({
				error: false,
				message: translate('task.add.success', req),
				data: taskResult
			})
		})
		.catch((err) => {
			if (err && err.code === 11000) {
				return res.status(400).send({
					error: true,
					message: translate('task.already.exist', req)
				})
			}

			res.status(400).send({
				error: true,
				message: err.message || translate('task.add.error', req)
			})
		})
}

export const taskListAll = (req: Request, res: Response) => {
	const filterQuery: any = {}

	if (req.userRole == 2 || req.userRole == 1) {
		filterQuery.created_by = req.query.userId ? req.query.userId : req.userId
	}

	Task.find(filterQuery)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username'
		})
		.populate({
			path: 'location',
			select: '_id name'
		})
		.populate({
			path: 'area',
			select: '_id title'
		})
		.populate('assigned')
		.then((taskResults) => {
			res.status(200).send({
				error: false,
				message: translate('task.retrieved.success', req),
				data: taskResults
			})
		})
		.catch((err) => {
			res.status(400).send({
				error: true,
				message: err.message || translate('task.retrieved.error', req)
			})
		})
}

export const taskListFiltered = (req: Request, res: Response) => {
	const page = parseInt(`${req.query.page}`)
	const limit = parseInt(`${req.query.limit}`)

	let status: number | Array<number> = 1
	let sortList = {}

	if (req.query.status) {
		if (req.query.status != 'all') {
			status = parseInt(`${req.query.status}`)
		} else {
			status = [0, 1]
		}
	}

	let filterQuery: any = {}
	let queryBuild: any = []

	if (req.query.search) {
		if (req.userRole == 2 || req.userRole == 1) {
			queryBuild = [
				{
					$or: [
						{ description: { $regex: '.*' + req.query.search + '.*', $options: 'i' } },
						{ task: { $regex: '.*' + req.query.search + '.*', $options: 'i' } }
					]
				},
				{ status: status },
				{ created_by: req.query.userId ? req.query.userId : req.userId }
			]
		} else {
			queryBuild = [
				{
					$or: [
						{ description: { $regex: '.*' + req.query.search + '.*', $options: 'i' } },
						{ task: { $regex: '.*' + req.query.search + '.*', $options: 'i' } }
					]
				},
				{ status: status }
			]
		}
	} else {
		if (req.userRole == 2 || req.userRole == 1) {
			queryBuild = [
				{ status: status },
				{ created_by: req.query.userId ? req.query.userId : req.userId }
			]
		} else {
			queryBuild = [{ status: status }]
		}
	}

	if (req.query.priority) {
		queryBuild.push({
			priority: { $regex: req.query.priority, $options: 'i' }
		})
	}

	if (req.query.area) {
		queryBuild.push({
			area: req.query.area
		})
	}

	if (req.query.location) {
		queryBuild.push({
			area: req.query.location
		})
	}

	if (req.query.dateFrom && req.query.dateTo) {
		queryBuild.push({
			createdAt: {
				$gte: moment(`${req.query.dateFrom}`).format('YYYY-MM-DD[T00:00:00.000Z]'),
				$lte: moment(`${req.query.dateFrom}`).format('YYYY-MM-DD[T00:00:00.000Z]')
			}
		})
	}

	filterQuery = {
		archived: req.query.archived,
		$and: queryBuild
	}

	if (req.query.sort) {
		let sort = `${req.query.sort}`
		let order = 1

		if (req.query.order) {
			order = req.query.order == 'asc' ? 1 : -1
		}

		sortList = { [sort]: order }
	} else {
		sortList = { ['createdAt']: 'desc' }
	}

	Task.countDocuments(filterQuery)
		.then((totalCount) => {
			const totalPages = Math.ceil(totalCount / limit)
			const skip = limit * (page - 1)

			let options = {}

			if (limit > 0) {
				options = {
					limit,
					skip
				}
			}

			Task.find(filterQuery, null, options)
				.select('-updatedAt -__v')
				.populate({
					path: 'created_by',
					match: { status: 1 },
					select: '_id first_name last_name email username'
				})
				.populate({
					path: 'location',
					select: '_id name'
				})
				.populate({
					path: 'area',
					select: '_id title'
				})
				.sort(sortList)
				.then((taskResults) => {
					res.status(200).send({
						error: false,
						message: translate('task.retrieved.success', req),
						data: {
							pages: totalPages,
							count: totalCount,
							currentPage: page,
							data: taskResults
						}
					})
				})
				.catch((err) => {
					res.status(400).send({
						error: true,
						message:
							err.message || translate('Some error occurred while retrieving tasks.', req)
					})
				})
		})
		.catch((err) => {
			res.status(400).send({
				error: true,
				message:
					err.message || translate('Some error occurred while retrieving tasks.', req)
			})
		})
}

export const taskDetails = (req: Request, res: Response) => {
	Task.findById(req.params.id)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username'
		})
		.then((taskResult) => {
			if (!taskResult) {
				return res.status(400).send({
					error: true,
					message: translate('task.not.found', req)
				})
			}
			res.status(200).send({
				error: false,
				message: translate('Successfully Retrieved task details', req),
				data: taskResult
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('task.not.found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('Error retrieving task with id ' + req.params.id, req)
			})
		})
}

export const taskUpdate = async (req: Request, res: Response) => {
	let updatedTask: any = {}

	if (req.body.audit) {
		updatedTask.audit = req.body.audit
	}

	if (req.body.task) {
		updatedTask.task = req.body.task
	}

	if (req.body.due_date) {
		updatedTask.due_date = req.body.due_date
	}

	if (req.body.location) {
		updatedTask.location = req.body.location
	}

	if (req.body.area) {
		updatedTask.area = req.body.area
	}

	if (req.body.priority) {
		updatedTask.priority = req.body.priority
	}

	if (req.body.task_status) {
		updatedTask.task_status = req.body.task_status
	}

	if (req.body.assigned) {
		updatedTask.assigned = req.body.assigned
	}

	if (req.body.description) {
		updatedTask.description = req.body.description
	}

	if (req.body.image) {
		updatedTask.image = req.body.image
	}

	updatedTask.archived = req.body.archived

	try {
		const result = await Task.findByIdAndUpdate(req.params.id, updatedTask, {
			new: true
		}).select('-updatedAt -__v')

		if (!result) {
			return res.status(400).send({
				error: true,
				message: translate('task.not.found', req)
			})
		} else {
			res.status(200).send({
				error: false,
				message: translate('task.update.success', req),
				data: result
			})
		}
	} catch (error: any) {
		console.error(error)
		if (error.kind === 'ObjectId') {
			return res.status(400).send({
				error: true,
				message: translate('task.not.found', req)
			})
		}

		return res.status(400).send({
			error: true,
			message: translate('task.update.error', req)
		})
	}
}

export const taskUpdateStatus = (req: Request, res: Response) => {
	if (!String(req.body.status)) {
		return res.status(400).send({
			error: true,
			message: translate('common.update.status.empty', req)
		})
	}

	Task.findByIdAndUpdate(
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
		.then((taskResult) => {
			if (!taskResult) {
				return res.status(400).send({
					error: true,
					message: translate('task.not.found', req)
				})
			}

			res.status(200).send({
				error: false,
				message: translate('task.update.status.success', req),
				data: taskResult
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('task.not.found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('task.update.error', req)
			})
		})
}

export const taskDelete = (req: Request, res: Response) => {
	Task.findByIdAndRemove(req.params.id)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username'
		})
		.then((taskResult) => {
			if (!taskResult) {
				return res.status(400).send({
					error: true,
					message: translate('task.not.found', req)
				})
			}

			res.status(200).send({
				error: false,
				message: translate('task.deleted.success', req)
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId' || err.name === 'NotFound') {
				return res.status(400).send({
					error: true,
					message: translate('task.not.found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('task.delete.error', req)
			})
		})
}

export const taskUploadImage = (req: Request, res: Response) => {
	if (req.file != null) {
		res.status(400).send({
			error: true,
			message: translate('common.upload.image.noImage', req)
		})
	}

	upload(req, res, (error) => {
		const filename = req?.file?.filename
		if (error) {
			res.send({
				error: true,
				message: translate('common.upload.image.error', req),
				data: error
			})
		}

		res.send({
			error: false,
			message: translate('task.upload.image.success', req),
			data: filename
		})
	})
}
