import { model, Schema, Types } from 'mongoose'

export type QuestionType = {
	_id: Types.ObjectId
	category: Types.ObjectId
	checklist: Types.ObjectId
	created_by: Types.ObjectId
	example: string
	language: string
	max_points: number
	order: number
	question: string
	status: number
}

const QuestionSchema = new Schema<QuestionType>(
	{
		category: {
			type: Schema.Types.ObjectId,
			ref: 'Category'
		},
		checklist: {
			type: Schema.Types.ObjectId,
			ref: 'Checklist'
		},
		created_by: {
			type: Schema.Types.ObjectId,
			ref: 'User'
		},
		example: {
			type: String
		},
		language: {
			type: String
		},
		max_points: {
			type: Number,
			default: 1,
			required: true
		},
		order: {
			type: Number,
			default: 1,
			required: true
		},
		question: {
			type: String,
			required: true
		},
		status: {
			type: Number,
			default: 1,
			required: true
		}
	},
	{
		timestamps: true
	}
)

export default model<QuestionType>('Question', QuestionSchema)
