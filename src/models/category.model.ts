import { model, Schema, Types } from 'mongoose'

export type CategoryType = {
	_id: Types.ObjectId
	name: string
	priority: number
	description: string
	status: number
	created_by: Types.ObjectId
}

const CategorySchema = new Schema<CategoryType>(
	{
		name: {
			type: String,
			required: true
		},
		priority: {
			type: Number,
			required: true
		},
		description: {
			type: String,
			required: true
		},
		status: {
			type: Number,
			default: 1,
			required: true
		},
		created_by: {
			type: Schema.Types.ObjectId,
			ref: 'User'
		}
	},
	{
		timestamps: true
	}
)

export default model<CategoryType>('Category', CategorySchema)
