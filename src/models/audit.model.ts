import { model, Schema, Types } from 'mongoose'
import { ScoreType } from './score.model'

export type AuditType = {
	area: Types.ObjectId
	checklist: Types.ObjectId
	created_by: Types.ObjectId
	scores: Array<ScoreType>
	status: number
}

const AuditSchema = new Schema<AuditType>(
	{
		area: {
			type: Schema.Types.ObjectId,
			ref: 'Area',
			required: true
		},
		scores: {
			type: [{ type: Schema.Types.ObjectId, ref: 'Score' }]
		},
		status: {
			type: Number,
			required: true
		},
		created_by: {
			type: Schema.Types.ObjectId,
			ref: 'User'
		},
		checklist: {
			type: Schema.Types.ObjectId,
			ref: 'Checklist',
			required: true
		}
	},
	{
		timestamps: true
	}
)

export default model<AuditType>('Audit', AuditSchema)
