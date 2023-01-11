import { model, Schema, Types } from 'mongoose'

export type AreaType = {
	title: string
	type: string
	location: Types.ObjectId
	description: string
	image: string
	status: number
	created_by: Types.ObjectId
}

const AreaSchema = new Schema<AreaType>(
	{
		title: {
			type: String,
			required: true
		},
		type: {
			type: String,
			required: true
		},
		location: {
			type: Schema.Types.ObjectId,
			ref: 'Location',
			required: true
		},
		description: {
			type: String,
			required: false
		},
		image: {
			type: String,
			default: ''
		},
		status: {
			type: Number,
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

export default model<AreaType>('Area', AreaSchema)
