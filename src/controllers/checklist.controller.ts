import Checklist from '../models/checklist.model'
import { translate } from '../utils/helpers'

export const create = async (req: any, res: any) => {
	if (!req.body.name) {
		return res.status(400).send({
			error: true,
			message: translate('common.name.not.empty', req)
		})
	}

	const newChecklist = {
		name: req.body.name,
		is_public: req.body.is_public,
		is_short: req.body.is_short,
		code: req.body.code,
		status: 1,
		standard: req.body.standard,
		created_by: req.userId,
		version: 1,
		type: req.body.type
	}

	const search = await Checklist.find({
		created_by: req.userId,
		name: req.body.name
	}).exec()

	if (search.length != 0) {
		return res.status(400).send({
			data: search,
			error: true,
			message: translate('checklist.title.exist', req)
		})
	}

	try {
		const checklist = new Checklist(newChecklist)

		const result = await checklist.save()

		res.status(200).send({
			error: false,
			message: translate('checklist.add.success', req),
			data: result
		})
	} catch (err: any) {
		if (err && err.code === 11000) {
			return res.status(400).send({
				error: true,
				message: translate('checklist.name.exist', req)
			})
		}

		res.status(400).send({
			error: true,
			message: err.message || translate('checklist.add.error', req)
		})
	}
}

export const update = async (req: any, res: any) => {
	let newChecklist: any = {}

	if (req.body.name) {
		newChecklist.name = req.body.name
	}

	if (req.body.version) {
		newChecklist.version = req.body.version
	}

	if (req.body.code) {
		newChecklist.code = req.body.code
	}

	if (req.body.language) {
		newChecklist.language = req.body.language
	}

	if (req.body.status) {
		newChecklist.status = req.body.status
	}

	if (req.body.type) {
		newChecklist.type = req.body.type
	}

	if (req.body.standard) {
		newChecklist.standard = req.body.standard
	}

	newChecklist.is_public = req.body.is_public
	newChecklist.is_short = req.body.is_short

	try {
		const checklist = await Checklist.findByIdAndUpdate(req.params.id, newChecklist, {
			new: true,
			select: '-updatedAt -__v'
		})
		if (!checklist) {
			return res.status(400).send({
				error: true,
				message: translate('checklist.not.found', req)
			})
		} else {
			res.status(200).send({
				error: false,
				message: translate('checklist.update.success', req),
				data: checklist
			})
		}
	} catch (err: any) {
		if (err.kind === 'ObjectId') {
			return res.status(400).send({
				error: true,
				message: translate('checklist.not.found', req)
			})
		}

		return res.status(400).send({
			error: true,
			message: translate('checklist.update.error', req)
		})
	}
}

export const remove = async (req: any, res: any) => {
	const result = await Checklist.findByIdAndRemove(req.params.id, {
		select: '-updatedAt -__v',
		populate: {
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username first_name last_name'
		}
	})
	try {
		if (!result) {
			return res.status(400).send({
				error: true,
				message: translate('checklist.not.found', req)
			})
		}

		res.status(200).send({
			error: false,
			message: translate('checklist.delete.success', req)
		})
	} catch (err: any) {
		if (err.kind === 'ObjectId' || err.name === 'NotFound') {
			return res.status(400).send({
				error: true,
				message: translate('Checklist not found with id ' + req.params.id, req)
			})
		}

		return res.status(400).send({
			error: true,
			message: translate('Could not delete checklist with id ' + req.params.id, req)
		})
	}
}

export const list = async (req: any, res: any) => {
	let filterQuery: any = {}

	if (req.userRole == 2) {
		filterQuery.created_by = req.userId
	}

	try {
		const result = await Checklist.find(
			filterQuery,
			{},
			{
				select: '-updatedAt -__v',
				populate: {
					path: 'created_by',
					match: { status: 1 },
					select: '_id email username'
				}
			}
		)
		res.status(200).send({
			error: false,
			message: translate('checklist.retrieved.success', req),
			data: result
		})
	} catch (err: any) {
		res.status(400).send({
			error: true,
			message: err.message || translate('checklist.retrieved.error', req)
		})
	}
}

export const details = async (req: any, res: any) => {
	const result = await Checklist.findById(
		req.params.id,
		{},
		{
			select: '-updatedAt -__v',
			populate: {
				path: 'created_by',
				match: { status: 1 },
				select: '_id email username'
			}
		}
	).exec()

	try {
		if (!result) {
			return res.status(400).send({
				error: true,
				message: translate('checklist not found with id ' + req.params.id, req)
			})
		}
		res.status(200).send({
			error: false,
			message: translate('Successfully Retrieved checklist details', req),
			data: result
		})
	} catch (err: any) {
		if (err.kind === 'ObjectId') {
			return res.status(400).send({
				error: true,
				message: translate('checklist not found with id ' + req.params.id, req)
			})
		}

		return res.status(400).send({
			error: true,
			message: translate('checklist.retrieved.error.id', req)
		})
	}
}

export const updateStatus = async (req: any, res: any) => {
	return res.status(200).send({
		error: false,
		message: translate('checklist.test.route', req)
	})
}
