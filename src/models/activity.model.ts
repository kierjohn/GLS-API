import { model, Schema, Types } from 'mongoose'

export type ActivityType = {
	objectId: string
	title: string
	type: string
	description: string
	created_by: Schema.Types.ObjectId
}
const ActivitySchema = new Schema<ActivityType>(
	{
		objectId: {
			type: String,
			required: true
		},
		title: {
			type: String,
			required: true
		},
		type: {
			type: String,
			required: true
		},
		description: {
			type: String,
			required: false
		},
		created_by: {
			type: Types.ObjectId,
			ref: 'User'
		}
	},
	{
		timestamps: true
	}
)

export default model<ActivityType>('Activity', ActivitySchema)
