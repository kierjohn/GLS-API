import jwt from 'jsonwebtoken'

const authorize = (roles: Array<Number>) => {
	const appSecret: string = `${process.env.APP_SECRET}`

	return [
		(req: any, res: any, next: any) => {
			const token = req.headers['x-access-token']

			if (roles.includes(0)) {
				if (token) {
					jwt.verify(token, appSecret, (err: any, decoded: any) => {
						if (err) {
							req.userRole = 0
							next()
						} else {
							req.userId = decoded.id
							req.userRole = decoded.role
							req.currentToken = token

							next()
						}
					})
				} else {
					req.userRole = 0
					next()
				}
			} else {
				if (!token)
					return res
						.status(403)
						.send({ error: true, auth: false, message: 'No token provided.' })

				jwt.verify(token, appSecret, (err: any, decoded: any) => {
					if (err)
						return res.status(500).send({
							error: true,
							auth: false,
							message: 'Failed to authenticate token.'
						})

					if (roles.length && !roles.includes(decoded.role)) {
						return res
							.status(401)
							.send({ error: true, auth: false, message: 'Unauthorized Access.' })
					}

					req.userId = decoded.id
					req.userRole = decoded.role
					req.currentToken = token

					next()
				})
			}
		}
	]
}

export default authorize
