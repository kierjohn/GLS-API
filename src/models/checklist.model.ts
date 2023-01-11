import { model, Schema, Types } from 'mongoose'

export type ChecklistType = {
	_id: Types.ObjectId
	created_by: Types.ObjectId
	code: string
	language: string
	name: string
	is_public: boolean
	is_short: boolean
	standard: string
	status: number
	version: string
	type: string
}

const ChecklistSchema = new Schema<ChecklistType>(
	{
		created_by: {
			type: Schema.Types.ObjectId,
			ref: 'User'
		},
		code: {
			type: String,
			required: true
		},
		language: {
			type: String,
			default: 'en',
			required: true
		},
		name: {
			type: String,
			required: true
		},
		is_public: {
			type: Boolean,
			default: false,
			required: true
		},
		is_short: {
			type: Boolean,
			required: true
		},
		status: {
			type: Number,
			default: 1,
			required: true
		},
		standard: {
			type: String,
			required: true,
			default: '5s'
		},
		version: {
			type: String,
			required: true,
			default: '1'
		},
		type: {
			type: String,
			required: true,
			default: 'production'
		}
	},
	{
		timestamps: true
	}
)

export default model<ChecklistType>('Checklist', ChecklistSchema)
