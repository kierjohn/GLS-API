import Activity from '../models/activity.model'
import Contact from '../models/contact.model'
import sgMail from '@sendgrid/mail'
import multer from 'multer'
import { translate } from '../utils/helpers'

const storageEngine = multer.diskStorage({
	destination: (req: any, file: any, callback: any) => {
		callback(null, './public/images/contact/')
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

export const sendContact = async (req: any, res: any) => {
	if (!req.body.email) {
		return res.status(400).send({
			error: true,
			message: translate('contact.email.empty', req)
		})
	}

	if (!req.body.title) {
		return res.status(400).send({
			error: true,
			message: translate('Title must not be empty', req)
		})
	}

	if (!req.body.body) {
		return res.status(400).send({
			error: true,
			message: translate('contact.message.empty', req)
		})
	}

	let obj = {
		email: req.body.email,
		title: req.body.title,
		body: req.body.body,
		created_by: req.userId
	}

	const contact = new Contact(obj)

	let item = await contact.save()

	let activityObj = {
		objectId: item._id,
		title: req.body.title,
		type: 'NEW_CONTACT',
		description: req.body.body,
		created_by: req.userId
	}

	const activity = new Activity(activityObj)
	activity.save()

	sgMail.setApiKey(`${process.env.SENDGRID_API_KEY}`)
	const template = `d-983a6ac5cc284e3eacd69a5dd56591ef`

	const mailOptions: sgMail.MailDataRequired = {
		from: {
			email: `${process.env.SENDGRID_FROM_EMAIL}`
		},
		personalizations: [
			{
				to: [
					{
						email: obj.email
					}
				],
				dynamicTemplateData: {
					title: obj.title,
					body: obj.body
				}
			}
		],
		templateId: template
	}

	await sgMail.send(mailOptions, false, (error: any, result: any) => {
		if (error) {
			res.status(200).send({
				error: true,
				message: error.message,
				data: item
			})
		}

		res.status(200).send({
			error: false,
			message: translate('contact.send.contact.success', req),
			data: item
		})
	})
}
