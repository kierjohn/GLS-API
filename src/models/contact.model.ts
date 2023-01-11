import { model, Schema, Types } from 'mongoose'

export type Contact = {
	email: string
    title: string
    body: string
    created_by: Types.ObjectId
}

let ContactSchema = new Schema<Contact>(
	{
		email: {
			type: String,
			required: true
		},
        title: {
			type: String,
			required: true
		},
		body: {
			type: String,
			required: true
		},
        created_by: {
			type: Schema.Types.ObjectId,
			ref: 'User'
		},
	},
	{
		timestamps: true
	}
)

export default model<Contact>('Contact', ContactSchema)
