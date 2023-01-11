import { model, Schema, Types } from 'mongoose'

export type ScoreType = {
	question: Types.ObjectId
	score: number
	image: string
	comment: string
	has_deviation: boolean
}

let ScoreSchema = new Schema<ScoreType>(
	{
		question: {
			type: Schema.Types.ObjectId,
			ref: 'Question',
			required: true
		},
		score: {
			type: Number,
			required: true
		},
		image: {
			type: String,
			default: ''
		},
		comment: {
			type: String,
			default: ''
		},
		has_deviation: {
			type: Boolean,
			default: false
		}
	},
	{
		timestamps: true
	}
)

export default model<ScoreType>('Score', ScoreSchema)
