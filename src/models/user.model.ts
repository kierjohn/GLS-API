import crypto from 'crypto'
import { Schema, Types, model } from 'mongoose'

export type UserType = {
	accept_cookies: boolean
	created_by: Types.ObjectId
	createdAt: Date
	email: string
	first_name: string
	image_url: string
	is_6s: boolean
	issues: boolean
	language: string
	last_name: string
	last_active: Date
	password: string
	role: number
	status: number
	subscription: string
	target_score: number
	task_order: Array<string>
	tester: boolean
	theme: string
	username: string
	userToken: string | undefined
	userTokenExpires: Date | undefined
	verified: boolean
	generateToken: () => void
	updateLastActive: () => void
}

const UserSchema = new Schema<UserType>(
	{
		accept_cookies: {
			type: Boolean
		},
		created_by: {
			type: Schema.Types.ObjectId,
			ref: 'User'
		},
		email: {
			type: String,
			required: true,
			unique: true
		},
		first_name: {
			type: String
		},
		image_url: {
			type: String
		},
		is_6s: {
			type: Boolean
		},
		issues: {
			type: Boolean
		},
		language: {
			type: String
		},
		last_name: {
			type: String
		},
		last_active: {
			type: Date,
			required: true
		},
		password: {
			type: String,
			required: true
		},
		role: {
			type: Number,
			default: 2
		},
		status: {
			type: Number,
			required: true
		},
		subscription: {
			type: String
		},
		target_score: {
			type: Number,
			required: false
		},
		task_order: {
			type: [
				{
					type: String
				}
			],
			required: false
		},
		tester: {
			type: Boolean,
			default: false,
			required: true
		},
		theme: {
			type: String
		},
		username: {
			type: String,
			unique: true
		},
		userToken: {
			type: String,
			required: false
		},
		userTokenExpires: {
			type: Date,
			required: false
		},
		verified: {
			type: Boolean
		}
	},
	{ timestamps: true }
)

UserSchema.methods.generateToken = function () {
	this.userToken = crypto.randomBytes(20).toString('hex')
	this.userTokenExpires = Date.now() + 86400000 //24hrs expiry
}

UserSchema.methods.updateLastActive = function () {
	this.last_active = Date.now()
}

export default model<UserType>('User', UserSchema)
