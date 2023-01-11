import { model, Schema, Types } from 'mongoose'

export type LocationType = {
	name: string
	description: string
	status: number
	created_by: Types.ObjectId
}

const LocationSchema = new Schema<LocationType>(
	{
		name: {
			type: String,
			required: true
		},
		description: {
			type: String,
			required: false
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

export default model<LocationType>('Location', LocationSchema)
