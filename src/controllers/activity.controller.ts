import Activity from '../models/activity.model'
import { translate } from '../utils/helpers'

export const activityListAll = (req: any, res: any) => {
	let filterQuery: any = {}

	if (req.userRole == 2 || req.userRole == 1) {
		filterQuery.created_by = req.userId
	}

	Activity.find(filterQuery)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username'
		})
		.then((activityResults) => {
			let message = 'activity.list.all.success'

			res.status(200).send({
				error: false,
				message: translate(message, req),
				data: activityResults
			})
		})
		.catch((err) => {
			let message = 'activity.list.all.error'
			res.status(400).send({
				error: true,
				message: err.message || translate(message, req)
			})
		})
}

export const activityListFiltered = (req: any, res: any) => {
	const page = parseInt(req.query.page)
	const limit = parseInt(req.query.limit)
	let status: number | Array<number> = 1

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
		}
	}

	if (page < 0 || page === 0) {
		let message = 'common.invalid.page.number'

		const response = {
			error: true,
			message: translate(message, req)
		}
		return res.json(response)
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

	Activity.countDocuments(filterQuery)
		.then((totalCount) => {
			var totalPages = Math.ceil(totalCount / limit)
			var skipValue = limit * (page - 1)

			Activity.find(filterQuery)
				.select('-updatedAt -__v')
				.populate({
					path: 'created_by',
					match: { status: 1 },
					select: '_id first_name last_name email username'
				})
				.limit(limit)
				.skip(skipValue)
				.sort(sortList)
				.then((activityResults) => {
					let message = 'activity.list.all.success'
					res.status(200).send({
						error: false,
						message: translate(message, req),
						data: {
							pages: totalPages,
							count: totalCount,
							currentPage: page,
							data: activityResults
						}
					})
				})
				.catch((err) => {
					res.status(400).send({
						error: true,
						message: err.message || translate('activity.list.all.error', req)
					})
				})
		})
		.catch((err) => {
			res.status(400).send({
				error: true,
				message: err.message || translate('activity.list.all.error', req)
			})
		})
}
