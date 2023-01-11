import Activity from '../models/activity.model'
import Location from '../models/location.model'
import Area from '../models/area.model'
import { translate } from '../utils/helpers'

export const locationAdd = (req: any, res: any) => {
	if (!req.body.name) {
		return res.status(400).send({
			error: true,
			message: translate('common.name.not.empty', req)
		})
	}

	Location.findOne({
		created_by: req.userId,
		name: req.body.name
	}).then((locationResults) => {
		if (locationResults != null) {
			return res.status(400).send({
				error: true,
				message: translate('location.add.name.exist', req)
			})
		} else {
			var locationObj = {
				name: req.body.name,
				description: req.body.description,
				status: 1,
				created_by: req.userId
			}

			const location = new Location(locationObj)

			location
				.save()
				.then((locationResult) => {
					let activityObj = {
						objectId: locationResult._id,
						title: req.body.name,
						type: 'NEW_LOCATION',
						description: req.body.description,
						created_by: req.userId
					}

					const activity = new Activity(activityObj)
					activity.save()

					res.status(200).send({
						error: false,
						message: translate('location.add.success', req),
						data: locationResult
					})
				})
				.catch((err) => {
					if (err && err.code === 11000) {
						return res.status(400).send({
							error: true,
							message: translate('location.add.name.exist', req)
						})
					}

					res.status(400).send({
						error: true,
						message:
							err.message ||
							translate('Some error occurred while adding the location.', req)
					})
				})
		}
	})
}

export const locationListAll = (req: any, res: any) => {
	const filterQuery: any = {}

	if (req.userRole == 2 || req.userRole == 1) {
		filterQuery.created_by = req.userId
	}

	Location.find(filterQuery)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username'
		})
		.then((locationResults) => {
			res.status(200).send({
				error: false,
				message: translate('location.retrieved.list.success', req),
				data: locationResults
			})
		})
		.catch((err) => {
			res.status(400).send({
				error: true,
				message: err.message || translate('location.retrieved.error', req)
			})
		})
}

export const locationListFiltered = (req: any, res: any) => {
	const page = parseInt(req.query.page)
	const limit = parseInt(req.query.limit)
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
						{ name: { $regex: '.*' + req.query.search + '.*', $options: 'i' } }
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
							{ name: { $regex: '.*' + req.query.search + '.*', $options: 'i' } }
						]
					},
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
		}
	}

	if (page < 0 || page === 0) {
		const response = {
			error: true,
			message: translate('Invalid page number, should start with 1', req)
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

	Location.countDocuments(filterQuery)
		.then((totalCount) => {
			var totalPages = Math.ceil(totalCount / limit)
			var skipValue = limit * (page - 1)

			Location.find(filterQuery)
				.select('-updatedAt -__v')
				.populate({
					path: 'created_by',
					match: { status: 1 },
					select: '_id first_name last_name email username'
				})
				.limit(limit)
				.skip(skipValue)
				.sort(sortList)
				.then((locationResults) => {
					res.status(200).send({
						error: false,
						message: translate('location.retrieved.list.success', req),
						data: {
							pages: totalPages,
							count: totalCount,
							currentPage: page,
							data: locationResults
						}
					})
				})
				.catch((err) => {
					res.status(400).send({
						error: true,
						message:
							err.message ||
							translate('Some error occurred while retrieving locations.', req)
					})
				})
		})
		.catch((err) => {
			res.status(400).send({
				error: true,
				message:
					err.message || translate('Some error occurred while retrieving locations.', req)
			})
		})
}

export const locationDetails = (req: any, res: any) => {
	Location.findById(req.params.id)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username'
		})
		.then((locationResult) => {
			if (!locationResult) {
				return res.status(400).send({
					error: true,
					message: translate('common.location.not.found', req)
				})
			}
			res.status(200).send({
				error: false,
				message: translate('location.retrieved.details', req),
				data: locationResult
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('common.location.not.found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('Error retrieving location with id ' + req.params.id, req)
			})
		})
}

export const locationUpdate = (req: any, res: any) => {
	let locationUpdate: any = {}

	if (req.body.name) {
		locationUpdate.name = req.body.name
	}

	if (req.body.status) {
		locationUpdate.status = req.body.status
	}

	locationUpdate.description = req.body.description

	Location.findByIdAndUpdate(req.params.id, locationUpdate, { new: true })
		.select('-updatedAt -__v')
		.then((locationResult) => {
			if (!locationResult) {
				return res.status(400).send({
					error: true,
					message: translate('common.location.not.found', req)
				})
			} else {
				let activityObj = {
					objectId: locationResult._id,
					title: req.body.name,
					type: 'UPDATE_LOCATION',
					description: req.body.description,
					created_by: req.userId
				}

				const activity = new Activity(activityObj)
				activity.save()

				res.status(200).send({
					error: false,
					message: translate('location.update.success', req),
					data: locationResult
				})
			}
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('common.location.not.found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('location.update.error', req)
			})
		})
}

export const locationUpdateStatus = (req: any, res: any) => {
	if (!String(req.body.status)) {
		return res.status(400).send({
			error: true,
			message: translate('common.update.status.empty', req)
		})
	}

	Location.findByIdAndUpdate(
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
		.then((locationResult) => {
			if (!locationResult) {
				return res.status(400).send({
					error: true,
					message: translate('common.location.not.found', req)
				})
			}

			res.status(200).send({
				error: false,
				message: translate('location.update.status.success', req),
				data: locationResult
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('common.location.not.found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('location.update.error', req)
			})
		})
}

export const locationDelete = (req: any, res: any) => {
	Area.findOne({ location: req.params.id })
		.then((locationResult) => {
			if (locationResult != null) {
				return res.status(400).send({
					error: true,
					message: translate(`location.already.in.use`, req)
				})
			} else {
				Location.findByIdAndRemove(req.params.id)
					.select('-updatedAt -__v')
					.populate({
						path: 'created_by',
						match: { status: 1 },
						select: '_id email username'
					})
					.then((locationResult) => {
						if (!locationResult) {
							return res.status(400).send({
								error: true,
								message: translate('common.location.not.found', req)
							})
						}

						let activityObj = {
							objectId: locationResult._id,
							title: locationResult.name,
							type: 'DELETE_LOCATION',
							description: locationResult.description,
							created_by: locationResult.created_by
						}

						const activity = new Activity(activityObj)
						activity.save()

						res.status(200).send({
							error: false,
							message: translate('location.delete.success', req)
						})
					})
					.catch((err) => {
						if (err.kind === 'ObjectId' || err.name === 'NotFound') {
							return res.status(400).send({
								error: true,
								message: translate('common.location.not.found', req)
							})
						}

						return res.status(400).send({
							error: true,
							message: translate('location.delete.error', req)
						})
					})
			}
		})
		.catch((err) => {
			if (err.kind === 'ObjectId' || err.name === 'NotFound') {
				return res.status(400).send({
					error: true,
					message: translate('Area common.location.not.found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('location.area.delete.error', req)
			})
		})
}

export const locationSeed = (req: any, res: any) => {
	const locations = [
		{ name: 'Location 1', description: 'description 1' },
		{ name: 'Location 2', description: 'description 2' },
		{ name: 'Location 3', description: 'description 3' },
		{ name: 'Location 4', description: 'description 4' },
		{ name: 'Location 5', description: 'description 5' }
	]

	for (let location of locations) {
		var locationInsert = new Location(location)
		locationInsert.save()
	}

	res.send('Location successfully seeded!')
}
