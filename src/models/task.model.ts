import { model, Schema, Types } from 'mongoose'

export type TaskType = {
	archived: boolean
	area: Types.ObjectId
	assigned: Array<Types.ObjectId>
	audit: Types.ObjectId
	created_by: Types.ObjectId
	description: string
	due_date: Date
	image: string
	location: Types.ObjectId
	priority: string
	status: number
	task_status: string
	task: string
}

const TaskSchema = new Schema<TaskType>(
	{
		archived: {
			type: Boolean,
			default: false,
			required: true
		},
		area: {
			type: Schema.Types.ObjectId,
			ref: 'Area',
			required: true
		},
		assigned: {
			type: [Schema.Types.ObjectId],
			ref: 'User',
			required: true
		},
		audit: {
			type: Schema.Types.ObjectId,
			ref: 'Audit',
			required: true
		},
		created_by: {
			type: Schema.Types.ObjectId,
			ref: 'User'
		},
		description: {
			type: String,
			default: ''
		},
		due_date: {
			type: Date,
			required: true
		},
		image: {
			type: String,
			default: ''
		},
		location: {
			type: Schema.Types.ObjectId,
			ref: 'Location',
			required: true
		},
		priority: {
			type: String,
			default: ''
		},
		status: {
			type: Number,
			default: 1,
			required: true
		},
		task_status: {
			type: String,
			default: ''
		},
		task: {
			type: String,
			required: true
		}
	},
	{
		timestamps: true
	}
)

export default model<TaskType>('Task', TaskSchema)
