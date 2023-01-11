import { UserType } from 'models/user.model'
import { Model } from 'mongoose'
import i18next from 'i18next'

export const generateUniqueAccountName = (
	email: any,
	user: Model<UserType, any, any, any>
) => {
	const proposedUsername = email.substring(0, email.lastIndexOf('@')).substring(0, 3)
	const d = new Date()
	const usernameExt = `${d.getMonth()}${d.getDate()}${d.getFullYear()}`
	const uniqueUsername = `${proposedUsername}${usernameExt}${generateRandomNumber(3)}`

	let account = null

	user
		.findOne({ username: uniqueUsername })
		.then(function (value: any) {
			account = value
		})
		.catch(function (err: any) {
			console.error(err)
			throw err
		})

	if (account) {
		generateUniqueAccountName(email, user)
	}

	return uniqueUsername
}

export const generateRandomNumber = (length: any) => {
	const min = 1000000000
	const max = 9999999999
	const generatedNumber = Math.floor(Math.random() * (max - min + 1)) + min

	return String(generatedNumber).substring(0, length)
}

export const translate = (key: string, req: any) => {
	const language = 'en'
	const languageFn = i18next.getFixedT(language)

	let text = key
	if (i18next.exists(key)) {
		text = languageFn(key)
	}
	return text
}
