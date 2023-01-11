import Category from '../models/category.model'
import { translate } from '../utils/helpers'

export const categoryAdd = (req: any, res: any) => {
	if (!req.body.name) {
		return res.status(400).send({
			error: true,
			message: translate('common.name.not.empty', req)
		})
	}

	if (!req.body.priority) {
		return res.status(400).send({
			error: true,
			message: translate('category.add.priority.empty', req)
		})
	}

	var categoryObj = {
		name: req.body.name,
		priority: req.body.priority,
		status: 1,
		created_by: req.userId
	}

	const category = new Category(categoryObj)

	category
		.save()
		.then((categoryResult) => {
			res.status(200).send({
				error: false,
				message: translate('category.add.success', req),
				data: categoryResult
			})
		})
		.catch((err) => {
			if (err && err.code === 11000) {
				return res.status(400).send({
					error: true,
					message: translate('category.exist', req)
				})
			}

			res.status(400).send({
				error: true,
				message: err.message || translate('common.add.category.error.occured', req)
			})
		})
}
export const categoryListAll = (req: any, res: any) => {
	var filterQuery = {}

	Category.find(filterQuery)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username'
		})
		.then((categoryResults) => {
			res.status(200).send({
				error: false,
				message: translate('category.list.all.success', req),
				data: categoryResults
			})
		})
		.catch((err) => {
			res.status(400).send({
				error: true,
				message: err.message || translate('category.list.all.error', req)
			})
		})
}
export const categoryListFiltered = (req: any, res: any) => {
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
				{ description: { $regex: req.query.search, $options: 'i' } },
				{ status: status }
			]
		}

		if (req.userRole == 2 || req.userRole == 1) {
			filterQuery = {
				$and: [
					{ description: { $regex: req.query.search, $options: 'i' } },
					{ status: status },
					{ created_by: req.userId }
				]
			}
		}
	} else {
		filterQuery = {
			status: status
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
		sortList = { name: req.query.sort }
	}

	Category.countDocuments(filterQuery)
		.then((totalCount) => {
			var totalPages = Math.ceil(totalCount / limit)
			var skipValue = limit * (page - 1)

			Category.find(filterQuery)
				.select('-updatedAt -__v')
				.populate({
					path: 'created_by',
					match: { status: 1 },
					select: '_id first_name last_name email username'
				})
				.limit(limit)
				.skip(skipValue)
				.sort(sortList)
				.then((categoryResults) => {
					res.status(200).send({
						error: false,
						message: translate('category.list.all.success', req),
						data: {
							pages: totalPages,
							count: totalCount,
							currentPage: page,
							data: categoryResults
						}
					})
				})
				.catch((err) => {
					res.status(400).send({
						error: true,
						message:
							err.message ||
							translate('Some error occurred while retrieving categorys.', req)
					})
				})
		})
		.catch((err) => {
			res.status(400).send({
				error: true,
				message:
					err.message || translate('Some error occurred while retrieving categorys.', req)
			})
		})
}
export const categoryDetails = (req: any, res: any) => {
	Category.findById(req.params.id)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username'
		})
		.then((categoryResult) => {
			if (!categoryResult) {
				return res.status(400).send({
					error: true,
					message: translate('category.details.error', req)
				})
			}
			res.status(200).send({
				error: false,
				message: translate('category.details.success', req),
				data: categoryResult
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('category.details.error', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('Error retrieving category with id ' + req.params.id, req)
			})
		})
}
export const categoryUpdate = (req: any, res: any) => {
	let categoryUpdate: any = {}

	if (req.body.name) {
		categoryUpdate.name = req.body.name
	}

	if (req.body.priority) {
		categoryUpdate.priority = req.body.priority
	}

	if (req.body.description) {
		categoryUpdate.description = req.body.description
	}

	if (req.body.status) {
		categoryUpdate.status = req.body.status
	}

	Category.findByIdAndUpdate(req.params.id, categoryUpdate, { new: true })
		.select('-updatedAt -__v')
		.then((categoryResult) => {
			if (!categoryResult) {
				return res.status(400).send({
					error: true,
					message: translate('category.details.error', req)
				})
			} else {
				res.status(200).send({
					error: false,
					message: translate('Successfully updated category!', req),
					data: categoryResult
				})
			}
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('category.details.error', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('Error updating category with id ' + req.params.id, req)
			})
		})
}
export const categoryUpdateStatus = (req: any, res: any) => {
	if (!String(req.body.status)) {
		return res.status(400).send({
			error: true,
			message: translate('common.update.status.empty', req)
		})
	}

	Category.findByIdAndUpdate(
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
		.then((categoryResult) => {
			if (!categoryResult) {
				return res.status(400).send({
					error: true,
					message: translate('category.details.error', req)
				})
			}

			res.status(200).send({
				error: false,
				message: translate('category.status.success', req),
				data: categoryResult
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('category.details.error', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('Error updating category with id ' + req.params.id, req)
			})
		})
}
export const categoryDelete = (req: any, res: any) => {
	Category.findByIdAndRemove(req.params.id)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username'
		})
		.then((categoryResult) => {
			if (!categoryResult) {
				return res.status(400).send({
					error: true,
					message: translate('category.details.error', req)
				})
			}

			res.status(200).send({
				error: false,
				message: translate('category.delete.success', req)
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId' || err.name === 'NotFound') {
				return res.status(400).send({
					error: true,
					message: translate('category.details.error', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('category.delete.error', req)
			})
		})
}
export const categorySeed = (req: any, res: any) => {
	const categorys = [
		{ name: 'S1', priority: 1 },
		{ name: 'S2', priority: 2 },
		{ name: 'S3', priority: 3 },
		{ name: 'S4', priority: 4 },
		{ name: 'S5', priority: 5 },
		{ name: 'S6', priority: 6 }
	]

	for (let category of categorys) {
		var categoryInsert = new Category(category)
		categoryInsert.save()
	}

	res.send('Category successfully seeded!')
}
