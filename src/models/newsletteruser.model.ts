import { model, Schema, Types } from 'mongoose'

export type NewsLetterUser = {
	email: string
    created_by: Types.ObjectId
	status : number
}

let NewsLetterUserSchema = new Schema<NewsLetterUser>(
	{
		email: {
			type: String,
			required: true
		},
        created_by: {
			type: Schema.Types.ObjectId,
			ref: 'User'
		},
		status: {
			type: Number,
			required: true
		},
	},
	{
		timestamps: true
	}
)

export default model<NewsLetterUser>('NewsLetterUser', NewsLetterUserSchema)
