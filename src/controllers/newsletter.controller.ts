import Activity from '../models/activity.model'
import NewsLetterUser from '../models/newsletteruser.model'
import sgMail from '@sendgrid/mail'
import multer from 'multer'
import { translate } from '../utils/helpers'

const storageEngine = multer.diskStorage({
	destination: (req: any, file: any, callback: any) => {
		callback(null, './public/images/news_letter/')
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

export const subscribeNewsLetter = async (req: any, res: any) => {
	if (!req.body.email) {
		return res.status(400).send({
			error: true,
			message: translate('contact.email.empty', req)
		})
	}

	const client = require('@sendgrid/client')
	client.setApiKey(process.env.SENDGRID_API_KEY)

	const data = {
		contacts: [
			{
				email: req.body.email
			}
		]
	}

	const request = {
		url: `/v3/marketing/contacts`,
		method: 'PUT',
		body: data
	}

	client
		.request(request)
		.then((res: any) => {})
		.catch((error: any) => {
			console.error(error)
		})

	res.status(200).send({
		error: false,
		message: translate('common.area.add.success', req),
		data: data
	})
}

export const unsubscribeNewsLetter = async (req: any, res: any) => {
	const filter = { created_by: req.userId }

	let count = await NewsLetterUser.countDocuments(filter).exec()

	if (count == 0) {
		res.status(200).send({
			error: false,
			message: translate('newsletter.user.not.exist', req),
			data: 0
		})
	}

	let item: any = await NewsLetterUser.findOneAndUpdate(filter, { status: 0 }).exec()

	let activityObj = {
		objectId: item._id,
		title: item.email,
		type: 'UNSUBSCRIBE_NEWS_LETTER_USER',
		description: 'unsubscribe',
		created_by: req.userId
	}

	const activity = new Activity(activityObj)
	activity.save()

	res.status(200).send({
		error: false,
		message: translate('newsletter.unsubscribe.success', req),
		data: item
	})
}

export const sendNewsLetter = async (req: any, res: any) => {
	const list: any[] = await NewsLetterUser.find({ status: 1 }).exec()

	if (list.length == 0) {
		res.status(200).send({
			error: true,
			message: translate('newsletter.subscriber.not.found', req),
			data: list
		})
	}
	const subscriber = list.map((item) => {
		return {
			email: item.email
		}
	})

	/*
	sgMail.setApiKey(`${process.env.SENDGRID_API_KEY}`)

	const template = `d-983a6ac5cc284e3eacd69a5dd56591ef`

	const mailOptions: sgMail.MailDataRequired = {
		from: {
			email: `${process.env.SENDGRID_FROM_EMAIL}`
		},
		personalizations: [
			{
				to: subscriber,
				dynamicTemplateData: {}
			}
		],
		templateId: template
	}

	await sgMail.send(mailOptions, false, (error: any, result: any) => {
		if (error) {
			res.status(200).send({
				error: true,
				message: error.message,
				data: 0
			})
		}

		res.status(200).send({
			error: false,
			message: translate('newsletter.send.success', req),
			data: 0
		})
	})
	*/
}
