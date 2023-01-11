import i18next from 'i18next'

import Category, { CategoryType } from '../models/category.model'
import Checklist from '../models/checklist.model'
import Question from '../models/question.model'
import { translate } from '../utils/helpers'

export const questionAdd = (req: any, res: any) => {
	if (!req.body.question) {
		return res.status(400).send({
			error: true,
			message: translate('question.add.empty', req)
		})
	}

	if (!req.body.category) {
		return res.status(400).send({
			error: true,
			message: translate('question.add.category.empty', req)
		})
	}

	if (!req.body.max_points) {
		return res.status(400).send({
			error: true,
			message: translate('question.add.maxPoints.empty', req)
		})
	}

	if (!req.body.example) {
		return res.status(400).send({
			error: true,
			message: translate('question.add.example.empty', req)
		})
	}

	if (!req.body.order) {
		return res.status(400).send({
			error: true,
			message: translate('question.add.order.empty', req)
		})
	}

	var questionObj = {
		checklist: req.body.checklist,
		question: req.body.question,
		example: req.body.example,
		category: req.body.category,
		max_points: req.body.max_points,
		order: req.body.order,
		status: 1,
		created_by: req.userId
	}

	const question = new Question(questionObj)

	question
		.save()
		.then((questionResult) => {
			res.status(200).send({
				error: false,
				message: translate('question.add.success', req),
				data: questionResult
			})
		})
		.catch((err) => {
			if (err && err.code === 11000) {
				return res.status(400).send({
					error: true,
					message: translate('question.already.exist', req)
				})
			}

			res.status(400).send({
				error: true,
				message: err.message || translate('question.add.error', req)
			})
		})
}

export const questionListAll = async (req: any, res: any) => {
	try {
		if (req.query.checklist) {
			const checklist = await Checklist.findOne({ code: req.query.checklist }).exec()

			if (!checklist) {
				res.status(400).send({
					error: true,
					message: translate('common.list.all.not.exist', req)
				})
			}

			const categoryResult = await Category.find(
				{ name: { $in: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] } },
				null,
				{
					sort: { priority: 'asc' },
					select: '-updatedAt -__v'
				}
			)

			let jsonRes: Array<any> = []
			let counter = 0

			categoryResult.forEach(async function (item: CategoryType) {
				try {
					const questionFilter: any = {
						category: item._id
					}

					if (req.query.checklist) {
						questionFilter.checklist = checklist?._id
					}

					const question = await Question.find(questionFilter)

					if (question) {
						counter++

						var obj = {
							categoryID: item._id,
							categoryName: item.name,
							categoryDescription: item.description,
							priority: item.priority,
							questions: question
						}

						jsonRes.push(obj)

						if (counter == categoryResult.length) {
							res.status(200).send({
								error: false,
								message: translate('question.retrieved.success', req),
								data: jsonRes
							})
						}
					} else {
						res.status(400).send({
							error: true,
							message: translate('question.retrieved.error', req)
						})
					}
				} catch (err) {
					res.status(400).send({
						error: true,
						message: err
					})
				}
			})
		}
	} catch (err: any) {
		res.status(400).send({
			error: true,
			message: err.message || translate('question.list.all.error', req)
		})
	}
}

export const questionListAllV2 = async (req: any, res: any) => {
	try {
		if (req.query.checklist) {
			const checklist = await Checklist.findById(req.query.checklist).exec()

			if (!checklist) {
				res.status(400).send({
					error: true,
					message: translate('common.list.all.not.exist', req)
				})
			}
		}

		let questionFilter: any = {}

		if (req.query.checklist) {
			questionFilter.checklist = req.query.checklist
		}

		const questions = await Question.find(
			questionFilter,
			{},
			{
				populate: {
					path: 'category',
					select: 'name priority description status'
				}
			}
		)

		res.status(200).send({
			error: false,
			message: translate('about.concept.description', req),
			data: questions
		})

		/*
		await i18next.init({
			lng: 'en', // if you're using a language detector, do not define the lng option
			debug: true,
			resources: {
			  en: {
				translation: {
				  "key": "Hallo Welt"
				}
			  }
			}
		});

		let test = i18next.t('key');
		*/

		/*
		if (questions.length) {
			res.status(200).send({
				error: false,
				message: translate('question.retrieved.success',req),
				data: questions
			})
		} else {
			res.status(400).send({
				error: true,
				message: translate('question.retrieved.error',req)
			})
		}
		*/
	} catch (err: any) {
		res.status(400).send({
			error: true,
			message: err.message || translate('question.list.all.error', req)
		})
	}
}

export const questionDetails = (req: any, res: any) => {
	if (!req.params.id) {
		res.status(400).send({
			error: true,
			message: translate('question.details.no.id', req)
		})
	}
	Question.findById(req.params.id)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username'
		})
		.then((questionResult) => {
			if (!questionResult) {
				return res.status(400).send({
					error: true,
					message: translate('question.not.found', req)
				})
			}
			res.status(200).send({
				error: false,
				message: translate('question.details.retrieved.success', req),
				data: questionResult
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('question.not.found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('question.details.retrieved.error', req)
			})
		})
}

export const questionUpdate = (req: any, res: any) => {
	let questionUpdate: any = {}

	if (req.body.question) {
		questionUpdate.question = req.body.question
	}

	if (req.body.example) {
		questionUpdate.example = req.body.example
	}

	if (req.body.category) {
		questionUpdate.category = req.body.category
	}

	if (req.body.max_points) {
		questionUpdate.max_points = req.body.max_points
	}

	if (req.body.order) {
		questionUpdate.order = req.body.order
	}

	if (req.body.status) {
		questionUpdate.status = req.body.status
	}

	Question.findByIdAndUpdate(req.params.id, questionUpdate, { new: true })
		.select('-updatedAt -__v')
		.then((questionResult) => {
			if (!questionResult) {
				return res.status(400).send({
					error: true,
					message: translate('question.not.found', req)
				})
			} else {
				res.status(200).send({
					error: false,
					message: translate('question.update.success', req),
					data: questionResult
				})
			}
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('question.not.found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('question.update.error', req)
			})
		})
}

export const questionUpdateStatus = (req: any, res: any) => {
	if (!String(req.body.status)) {
		return res.status(400).send({
			error: true,
			message: translate('common.update.status.empty', req)
		})
	}

	Question.findByIdAndUpdate(
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
		.then((questionResult) => {
			if (!questionResult) {
				return res.status(400).send({
					error: true,
					message: translate('question.not.found', req)
				})
			}

			res.status(200).send({
				error: false,
				message: translate('Successfully updated question status!', req),
				data: questionResult
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId') {
				return res.status(400).send({
					error: true,
					message: translate('question.not.found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('question.update.error', req)
			})
		})
}

export const questionDelete = (req: any, res: any) => {
	Question.findByIdAndRemove(req.params.id)
		.select('-updatedAt -__v')
		.populate({
			path: 'created_by',
			match: { status: 1 },
			select: '_id email username'
		})
		.then((questionResult) => {
			if (!questionResult) {
				return res.status(400).send({
					error: true,
					message: translate('question.not.found', req)
				})
			}

			res.status(200).send({
				error: false,
				message: translate('question.deleted.success', req)
			})
		})
		.catch((err) => {
			if (err.kind === 'ObjectId' || err.name === 'NotFound') {
				return res.status(400).send({
					error: true,
					message: translate('question.not.found', req)
				})
			}

			return res.status(400).send({
				error: true,
				message: translate('question.deleted.error', req)
			})
		})
}

export const questionSeed = (req: any, res: any) => {
	const questions = req.body.questions

	for (let question of questions) {
		var questionInsert = new Question(question)
		questionInsert.save()
	}

	res.send('Question successfully seeded!')
}
