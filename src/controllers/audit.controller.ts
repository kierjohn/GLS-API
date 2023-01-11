import mongoose from 'mongoose'
import Activity from '../models/activity.model'
import Area from '../models/area.model'
import Audit from '../models/audit.model'
import Location from '../models/location.model'
import Score from '../models/score.model'
import User from '../models/user.model'

import sgMail from '@sendgrid/mail'
import multer from 'multer'
import { translate } from '../utils/helpers'

const storageEngine = multer.diskStorage({
	destination: (req: any, file: any, callback: any) => {
		callback(null, './public/images/audit/')
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

export const auditAdd = async (req: any, res: any) => {
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

	if (!req.body.area) {
		return res.status(400).send({
			error: true,
			message: translate('common.audit.add.area.empty', req)
		})
	}

	if (!req.body.scores) {
		return res.status(400).send({
			error: true,
			message: translate('audit.add.score.empty', req)
		})
	}

	let counter = 0
	let scoresArray: Array<any> = []

	req.body.scores.forEach(function (item: any) {
		const score = new Score(item)

		score
			.save()
			.then((scoreResult) => {
				scoresArray.push(scoreResult['_id'])
				counter++

				if (counter == req.body.scores.length) {
					var auditObj = {
						area: req.body.area,
						scores: scoresArray,
						status: 1,
						created_by: req.userId,
						checklist: req.body.checklist
					}

					const audit = new Audit(auditObj)

					audit
						.save()
						.then((auditResult) => {
							Area.findById(auditResult.area).then((resultArea) => {
								let activityObj = {
									objectId: auditResult._id,
									title: resultArea?.title,
									type: 'NEW_AUDIT',
									description: '',
									created_by: req.userId
								}

								const activity = new Activity(activityObj)
								activity.save()

								res.status(200).send({
									error: false,
									message: translate('audit.add.success', req),
									data: auditResult
								})
							})
						})
						.catch((err) => {
							res.status(400).send({
								error: true,
								message:
									err.message || translate('common.add.category.error.occured', req)
							})
						})
				}
			})
			.catch((err) => {
				res.status(400).send({
					error: true,
					message: err.message || translate('common.add.category.error.occured', req)
				})
			})
	})
}

export const auditListAll = (req: any, res: any) => {
	let filterQuery: any = {}

	if (req.userRole == 2 || req.userRole == 1) {
		filterQuery.created_by = req.userId
	}

	if (req.query.range) {
		const date = new Date()
		date.setMonth(date.getMonth() - req.query.range)
		date.setDate(1)

		filterQuery.createdAt = { $gte: date }
	}

	Audit.find(filterQuery)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username first_name last_name'
		})
		.populate({
			path: 'scores',
			populate: {
				path: 'question',
				select: '_id order question category max_points',
				populate: {
					path: 'category',
					select: '_id name description priority'
				}
			},
			select: '_id question score image comment has_deviation'
		})
		.populate({
			path: 'area',
			select: '_id title'
		})
		.populate({
			path: 'checklist',
			select: '_id name language version type code is_short standard status'
		})
		.then((auditResults) => {
			res.status(200).send({
				error: false,
				message: translate('audit.retrieved.success', req),
				data: auditResults
			})
		})
		.catch((err) => {
			res.status(400).send({
				error: true,
				message: err.message || translate('audit.retrieving.error.occured', req)
			})
		})
}

export const auditHistoryListAll = (req: any, res: any) => {
	let filterQuery: any = {}

	if (req.userRole == 2 || req.userRole == 1) {
		filterQuery.created_by = req.userId
	}

	if (req.query.areaId) {
		filterQuery = {
			$and: [{ area: req.query.areaId }]
		}
	}

	let sortList = {}
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

	Audit.find(filterQuery)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username first_name last_name'
		})
		.populate({
			path: 'scores',
			select: '_id score image comment has_deviation'
		})
		.populate({
			path: 'area',
			select: '_id title'
		})
		.populate({
			path: 'checklist',
			select: '_id name language version type code is_short standard status'
		})
		.then((auditResults) => {
			let result: Array<{ [key: string]: any }> = []

			auditResults.forEach(function (item: any) {
				let totalScore = 0
				let obj: any = {}

				obj._id = item._id
				obj.code = item.code
				obj.area = item.area
				obj.status = item.status
				obj.created_by = item.created_by
				obj.createdAt = item.createdAt
				obj.checklist = item.checklist

				item['scores'].forEach(function (item: any) {
					totalScore = totalScore + item['score']
				})

				obj['totalScore'] = totalScore
				result.push(obj)
			})

			res.status(200).send({
				error: false,
				message: translate('audit.history.list.all.success', req),
				data: result
			})
		})
		.catch((err) => {
			res.status(400).send({
				error: true,
				message: err.message || translate('audit.retrieving.error.occured', req)
			})
		})
}

export const auditListFiltered = (req: any, res: any) => {
	const page = parseInt(req.query.page)
	const limit = parseInt(req.query.limit)

	let status: number | Array<Number> = 1
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
				{ description: { $regex: req.query.search, $options: 'i' } },
				{ status: status }
			]
		}

		if (req.userRole == 2 || req.userRole == 1) {
			filterQuery = {
				$and: [
					{ description: { $regex: req.query.search, $options: 'i' } },
					{ status: status },
					{ created_by: req.query.userId ? req.query.userId : req.userId }
				]
			}
		}
	} else {
		filterQuery = {
			status: status
		}

		if (req.userRole == 2 || req.userRole == 1) {
			filterQuery = {
				$and: [
					{ status: status },
					{ created_by: req.query.userId ? req.query.userId : req.userId }
				]
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

	if (req.query.area) {
		filterQuery.area = req.query.area

		Area.findById(req.query.area)
			.select('-updatedAt -__v')
			.then((areaResult) => {
				if (!areaResult) {
					return res.status(400).send({
						error: true,
						message: translate('audit.list.filtered.area.not.found', req)
					})
				} else {
					auditFiltered(page, limit, res, sortList, filterQuery, req)
				}
			})
			.catch((err) => {
				if (err.kind === 'ObjectId') {
					return res.status(400).send({
						error: true,
						message: translate('Area with id ' + req.query.area + ' not found', req)
					})
				}

				return res.status(400).send({
					error: true,
					message: translate('audit.details.retrieved.audit.error', req)
				})
			})
	} else {
		auditFiltered(page, limit, res, sortList, filterQuery, req)
	}
}

export const auditListFilteredV2 = async (req: any, res: any) => {
	const page = parseInt(req.query.page)
	const limit = parseInt(req.query.limit)

	try {
		if (!page) {
			return res.status(400).send({
				error: true,
				message: 'page is required'
			})
		}

		if (!limit) {
			return res.status(400).send({
				error: true,
				message: 'limit is required'
			})
		}

		if (!req.query.standard) {
			return res.status(400).send({
				error: true,
				message: 'standard is required'
			})
		}

		let matchAudit: any = {
			$and: [{ created_by: new mongoose.Types.ObjectId(req.query.userId) }]
		}

		if (req.query.area) {
			matchAudit.$and.push({ area: new mongoose.Types.ObjectId(req.query.area) })
		}

		if (req.query.range) {
			const date = new Date()
			date.setMonth(date.getMonth() - req.query.range)
			date.setDate(1)

			matchAudit.$and.push({ createdAt: { $gte: date } })
		}

		let matchChecklist: any = {
			'checklist.standard': req.query.standard
		}

		switch (req.query.is_short) {
			case 'short':
				matchChecklist['checklist.is_short'] = true
				break
			case 'full':
				matchChecklist['checklist.is_short'] = false
				break
		}

		const filteredAudits: any = await Audit.aggregate([
			{
				$match: matchAudit
			},
			{
				$lookup: {
					from: 'checklists',
					localField: 'checklist',
					foreignField: '_id',
					as: 'checklist'
				}
			},
			{
				$unwind: '$checklist'
			},
			{
				$match: matchChecklist
			},
			{
				$lookup: {
					from: 'scores',
					localField: 'scores',
					foreignField: '_id',
					as: 'scores',
					pipeline: [
						{
							$lookup: {
								from: 'questions',
								localField: 'question',
								foreignField: '_id',
								as: 'question',
								pipeline: [
									{
										$lookup: {
											from: 'categories',
											localField: 'category',
											foreignField: '_id',
											as: 'category'
										}
									},
									{
										$unwind: '$category'
									}
								]
							}
						},
						{
							$unwind: '$question'
						}
					]
				}
			},
			{
				$lookup: {
					from: 'users',
					localField: 'created_by',
					foreignField: '_id',
					as: 'created_by'
				}
			},
			{
				$lookup: {
					from: 'areas',
					localField: 'area',
					foreignField: '_id',
					as: 'area'
				}
			},
			{
				$unwind: '$created_by'
			},
			{
				$unwind: '$area'
			},
			{
				$addFields: {
					totalScores: { $sum: '$scores.score' }
				}
			},
			{
				$facet: {
					totalCount: [{ $count: 'count' }],
					data: [
						{ $sort: { createdAt: -1 } },
						{ $skip: (page - 1) * limit },
						{ $limit: limit }
					]
				}
			},
			{
				$unwind: '$totalCount'
			}
		]).exec()

		res.status(200).send({
			error: false,
			message: translate('audit.retrieved.success', req),
			data: {
				pages: Boolean(filteredAudits[0]?.totalCount?.count)
					? Math.ceil(filteredAudits[0]?.totalCount?.count / limit)
					: 0,
				count: filteredAudits[0]?.totalCount?.count
					? filteredAudits[0]?.totalCount?.count
					: 0,
				currentPage: page,
				data: filteredAudits[0]?.data ? filteredAudits[0]?.data : []
			}
		})
	} catch (error: any) {
		res.status(400).send({
			error: true,
			message: error.message || translate('common.audit.retrieved.error.', req)
		})
	}
}

export const auditDetails = (req: any, res: any) => {
	Audit.findById(req.params.id)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username first_name last_name target_score'
		})
		.populate({
			path: 'scores',
			populate: {
				path: 'question',
				select: '_id order question category max_points',
				populate: {
					path: 'category',
					select: '_id name priority description'
				}
			},
			select: '_id question score image comment has_deviation'
		})
		.populate({
			path: 'area',
			select: '_id title'
		})
		.populate({
			path: 'checklist',
			select: '_id name language version type code is_short standard status'
		})
		.then((auditResult) => {
			if (!auditResult) {
				return res.status(400).send({
					error: true,
					message: translate('common.audit.not,found', req)
				})
			}
			res.status(200).send({
				error: false,
				message: translate('audit.details.success', req),
				data: auditResult
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('common.audit.not,found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('audit.details.retrieved.audit.error', req)
			})
		})
}

export const auditUpdate = (req: any, res: any) => {
	let auditUpdate: any = {}

	if (req.body.name) {
		auditUpdate.name = req.body.name
	}

	if (req.body.status) {
		auditUpdate.status = req.body.status
	}

	auditUpdate.description = req.body.description

	Audit.findByIdAndUpdate(req.params.id, auditUpdate, { new: true })
		.select('-updatedAt -__v')
		.then((auditResult) => {
			if (!auditResult) {
				return res.status(400).send({
					error: true,
					message: translate('common.audit.not,found', req)
				})
			} else {
				let activityObj = {
					objectId: auditResult._id,
					title: req.body.name,
					type: 'UPDATE_LOCATION',
					description: req.body.description,
					created_by: req.userId
				}

				const activity = new Activity(activityObj)
				activity.save()

				res.status(200).send({
					error: false,
					message: translate('audti.update.success', req),
					data: auditResult
				})
			}
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('common.audit.not,found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('common.audit.update.error', req)
			})
		})
}

export const auditUpdateStatus = (req: any, res: any) => {
	if (!String(req.body.status)) {
		return res.status(400).send({
			error: true,
			message: translate('common.update.status.empty', req)
		})
	}

	Audit.findByIdAndUpdate(
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
			select: '_id email username first_name last_name'
		})
		.then((auditResult) => {
			if (!auditResult) {
				return res.status(400).send({
					error: true,
					message: translate('common.audit.not,found', req)
				})
			}

			res.status(200).send({
				error: false,
				message: translate('audit.update.status.success', req),
				data: auditResult
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('common.audit.not,found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('common.audit.update.error', req)
			})
		})
}

export const auditDelete = (req: any, res: any) => {
	Audit.findByIdAndRemove(req.params.id)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username first_name last_name'
		})
		.then((auditResult: any) => {
			if (!auditResult) {
				return res.status(400).send({
					error: true,
					message: translate('common.audit.not,found', req)
				})
			}

			let activityObj = {
				objectId: auditResult._id,
				title: auditResult.name,
				type: 'DELETE_LOCATION',
				description: auditResult.description,
				created_by: auditResult.created_by
			}

			const activity = new Activity(activityObj)
			activity.save()

			res.status(200).send({
				error: false,
				message: translate('audit.delete.success', req)
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId' || err.name === 'NotFound') {
				return res.status(400).send({
					error: true,
					message: translate('common.audit.not,found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('audit.delete.error', req)
			})
		})
}

export const auditUploadImage = (req: any, res: any) => {
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
			message: translate('audit.upload.image.success', req),
			data: filename
		})
	})
}

const auditFiltered = (
	page: number,
	limit: number,
	res: any,
	sortList: any,
	filterQuery: any,
	req: any
) => {
	Audit.countDocuments(filterQuery)
		.then((totalCount) => {
			var totalPages = Math.ceil(totalCount / limit)
			var skipValue = limit * (page - 1)

			Audit.find(filterQuery)
				.select('-updatedAt -__v')
				.populate({
					path: 'created_by',
					match: { status: 1 },
					select: '_id email username first_name last_name'
				})
				.populate({
					path: 'scores',
					populate: {
						path: 'question',
						select: '_id order question category max_points',
						populate: {
							path: 'category',
							select: '_id name priority'
						}
					},
					select: '_id question score image comment has_deviation'
				})
				.populate({
					path: 'area',
					select: '_id title'
				})
				.populate({
					path: 'checklist',
					select: '_id name language version type code is_short standard status'
				})
				.limit(limit)
				.skip(skipValue)
				.sort(sortList)
				.then((auditResults) => {
					res.status(200).send({
						error: false,
						message: translate('audit.retrieved.success', req),
						data: {
							pages: totalPages,
							count: totalCount,
							currentPage: page,
							data: auditResults
						}
					})
				})
				.catch((err) => {
					res.status(400).send({
						error: true,
						message: err.message || translate('common.audit.retrieved.error.', req)
					})
				})
		})
		.catch((err) => {
			res.status(400).send({
				error: true,
				message: err.message || translate('common.audit.retrieved.error.', req)
			})
		})
}

export const counter = (req: any, res: any) => {
	var filterQuery = { created_by: req.userId }

	Audit.countDocuments(filterQuery)
		.then((auditTotalCount) => {
			var locationCount = 0
			var areaCount = 0

			Location.countDocuments(filterQuery).then((locationTotalCount) => {
				locationCount = locationTotalCount

				Area.countDocuments(filterQuery).then((areaTotalCount) => {
					areaCount = areaTotalCount

					res.status(200).send({
						data: {
							location: locationCount,
							area: areaCount,
							audit: auditTotalCount,
							userId: req.userId
						},
						error: false
					})
				})
			})
		})
		.catch((err) => {
			res.status(400).send({
				error: true,
				message: err.message || translate('common.audit.retrieved.error.', req)
			})
		})
}

export const reportAll = async (req: any, res: any) => {
	var filterQuery = { created_by: req.userId }

	let pipeline = []

	if (req.query.start && req.query.end) {
		let start = req.query.start
		let end = req.query.end

		pipeline.push({
			$match: {
				createdAt: {
					$gte: new Date(`${start}T02:27:51.000+00:00`),
					$lte: new Date(`${end}T02:27:51.000+00:00`)
				}
			}
		})
	}

	pipeline = [
		...pipeline,
		{
			$lookup: {
				from: 'areas',
				localField: 'area',
				foreignField: '_id',
				as: 'area_info'
			}
		},
		{ $unwind: '$area_info' },
		{
			$lookup: {
				from: 'scores',
				localField: 'scores',
				foreignField: '_id',
				as: 'score_info',
				pipeline: [
					{
						$lookup: {
							from: 'questions',
							localField: 'question',
							foreignField: '_id',
							as: 'question_info',
							pipeline: [
								{
									$lookup: {
										from: 'categories',
										localField: 'category',
										foreignField: '_id',
										as: 'category_info'
									}
								},
								{ $unwind: '$category_info' }
							]
						}
					},
					{ $unwind: '$question_info' }
				]
			}
		},
		{ $unwind: '$score_info' },
		{
			$project: {
				area_title: '$area_info.title',
				score: '$score_info.score',
				category: '$score_info.question_info.category',
				category_name: '$score_info.question_info.category_info.name'
			}
		},
		{
			$group: {
				_id: { category: '$category', category_name: '$category_name' },
				score: { $push: '$score' }
			}
		},
		{
			$project: {
				_id: '$_id',
				score: { $sum: '$score' }
			}
		}
	]

	const result = await Audit.aggregate(pipeline).exec()
	let total = 0
	result.forEach((item) => {
		total += item.score
	})

	res.status(200).send({
		data: {
			audits: result,
			total: total,
			userId: req.userId
		},
		error: false
	})
}

export const reportByArea = async (req: any, res: any) => {
	var filterQuery = { created_by: req.userId }

	let area = req.params.area

	let pipeline = []

	if (req.query.start && req.query.end) {
		let start = req.query.start
		let end = req.query.end

		pipeline.push({
			$match: {
				createdAt: {
					$gte: new Date(`${start}T02:27:51.000+00:00`),
					$lte: new Date(`${end}T02:27:51.000+00:00`)
				}
			}
		})
	}

	pipeline = [
		...pipeline,
		{
			$lookup: {
				from: 'areas',
				localField: 'area',
				foreignField: '_id',
				as: 'area_info'
			}
		},
		{ $unwind: '$area_info' },
		{
			$lookup: {
				from: 'scores',
				localField: 'scores',
				foreignField: '_id',
				as: 'score_info',
				pipeline: [
					{
						$lookup: {
							from: 'questions',
							localField: 'question',
							foreignField: '_id',
							as: 'question_info',
							pipeline: [
								{
									$lookup: {
										from: 'categories',
										localField: 'category',
										foreignField: '_id',
										as: 'category_info'
									}
								},
								{ $unwind: '$category_info' }
							]
						}
					},
					{ $unwind: '$question_info' }
				]
			}
		},
		{ $unwind: '$score_info' },
		{
			$project: {
				area_title: '$area_info.title',
				area: '$area_info._id',
				score: '$score_info.score',
				category: '$score_info.question_info.category',
				category_name: '$score_info.question_info.category_info.name'
			}
		},
		{
			$match: {
				area: area
			}
		},
		{
			$group: {
				_id: { category: '$category', category_name: '$category_name' },
				score: { $push: '$score' }
			}
		},
		{
			$project: {
				_id: '$_id',
				score: { $sum: '$score' }
			}
		}
	]

	const result = await Audit.aggregate(pipeline).exec()
	let total = 0
	result.forEach((item) => {
		total += item.score
	})

	res.status(200).send({
		data: {
			audits: result,
			total: total,
			userId: req.userId
		},
		error: false
	})
}

export const shareReport = async (req: any, res: any) => {
	const { area, email, link } = req.body
	sgMail.setApiKey(`${process.env.SENDGRID_API_KEY}`)
	const user = await User.findById(req.userId)

	if (!user) {
		return res
			.status(400)
			.send({ error: true, message: translate('audit.shareReport.user.not.found', req) })
	}

	const mailOptions: sgMail.MailDataRequired = {
		from: {
			name: 'GoLeanSigma Team',
			email: `${process.env.SENDGRID_FROM_EMAIL}`
		},
		personalizations: [
			{
				to: [
					{
						email
					}
				],
				dynamicTemplateData: {
					name: user.first_name,
					link,
					area
				}
			}
		],
		templateId: `${
			user.language === 'en'
				? process.env.SENDGRID_EN_SHARE_REPORT_TEMPLATE_ID
				: process.env.SENDGRID_SHARE_REPORT_TEMPLATE_ID
		}`
	}

	await sgMail.send(mailOptions, false, (error: any, result: any) => {
		if (error) {
			return res.status(400).send({ error: true, message: error.message })
		}
		res.status(200).send({
			error: false,
			message: translate('audit.email.sent', req)
		})
	})
}
