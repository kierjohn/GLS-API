import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import express, { Application, NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import morgan from 'morgan'

import activity from './routes/activity.route'
import area from './routes/area.route'
import audit from './routes/audit.route'
import category from './routes/category.route'
import checklist from './routes/checklist.route'
import location from './routes/location.route'
import question from './routes/question.route'
import report from './routes/report.route'
import task from './routes/task.route'
import user from './routes/user.route'
import contact from './routes/contact.route'
import newsletter from './routes/newsletter.route'
import i18next from 'i18next'

import common_de from './translations/de/common.json'
import common_en from './translations/en/common.json'

const cookieParser = require('cookie-parser')
const app: Application = express()

dotenv.config()

const setupHeader = (req: Request, res: Response, next: NextFunction) => {
	res.header('Access-Control-Allow-Origin', '*')
	res.header(
		'Access-Control-Allow-Headers',
		'x-access-token, Origin, X-Requested-With, Content-Type, Accept'
	)
	res.header(
		'Access-Control-Request-Header',
		'x-access-token, Origin, X-Requested-With, Content-Type, Accept'
	)
	res.header('Access-Control-Allow-Methods', 'PUT,DELETE')
	next()
}
app.use(setupHeader)

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(morgan('dev'))
app.set('superSecret', process.env.APP_SECRET)

app.use('/public/images', express.static('public/images'))
app.use('/public/data', express.static('public/data'))

app.use('/activity', activity)
app.use('/area', area)
app.use('/audit', audit)
app.use('/category', category)
app.use('/checklist', checklist)
app.use('/location', location)
app.use('/question', question)
app.use('/report', report)
app.use('/task', task)
app.use('/user', user)
app.use('/contact', contact)
app.use('/newsletter', newsletter)
app.use(cookieParser())

const port = process.env.APP_PORT

app.listen(port, () => {
	console.log('Server is up and running on port number ' + port)
})

mongoose
	.connect(process.env.DB_HOST + '/' + process.env.DB_NAME)
	.then(() => {
		console.log('Successfully connected to the database')
	})
	.catch((err) => {
		console.log(process.env.DB_HOST + '/' + process.env.DB_NAME)
		console.log('Could not connect to the database. Exiting now...' + err)
		process.exit()
	})

i18next.init({
	lng: 'en',
	resources: {
		en: {
			translation: common_en
		},
		de: {
			translation: common_de
		}
	}
})
