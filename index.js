const debug = require("debug")("express-openapi-route")
const express = require("express")
const Ajv = require("ajv").default
const AjvFormats = require("ajv-formats")
const SwaggerClient = require("swagger-client")
const createError = require("http-errors")
const parametersToJsonschema = require("./parametersToJsonschema")

function convertOpenapiPathToExpressPath(path) {
	const matches = path.match(/\{([^}{]+)\}/g)

	if (!matches) return path

	for (const match of matches) {
		const newMatch = match.replace(/[\{\}]/g, "")
		path = path.replace(match, ":" + newMatch)
	}

	return path
}

function deepCopyIgnoringExpress(obj) {
	if (obj === undefined || obj === null) return obj

	if (Array.isArray(obj)) return obj.map(deepCopyIgnoringExpress)

	if (obj.constructor === Object) {
		let ret = {}
		for (const k in obj) {
			if (k === "$express") continue
			ret[k] = deepCopyIgnoringExpress(obj[k])
		}
		return ret
	}

	return obj
}

function Api(openApischema) {
	const route = express.Router()
	route.use(express.json())

	const textSchema = deepCopyIgnoringExpress(openApischema)

	route.get("/schema.json", (req, res) => {
		res.json(textSchema)
	})

	const ajv = new Ajv({ coerceTypes: true, strict: false })
	AjvFormats(ajv)

	SwaggerClient({ spec: openApischema }).then(({ spec }) => {
		debug("spec resolved")
		for (const pathString in spec.paths) {
			const path = spec.paths[pathString]
			debug("building path", pathString)

			for (const verb in path) {
				const procedure = path[verb]

				const expressPath = convertOpenapiPathToExpressPath(pathString)

				const { requestBody, $express, parameters, responses } = procedure

				const handlers = [].concat($express)

				const parameterJsonschema = parametersToJsonschema(parameters)

				const parameterValidator = ajv.compile({
					...parameterJsonschema,
					$async: true,
				})
				handlers.unshift((req, res, next) => {
					const { cookies, params, query } = req

					parameterValidator({ cookies, params, query })
						.then(() => next())
						.catch((err) => next(createError(400, { errors:err.errors })))
				})

				if (requestBody) {
					// @TODO What if not json!
					const jsonschema = requestBody.content["application/json"].schema
					if (!jsonschema) throw Error("Cannot parse a non-JSON body")
					const validator = ajv.compile({ ...jsonschema, $async: true })
					const bodyHandler = (req, res, next) => {
						validator(req.body)
							.then(() => next())
							.catch((err) => next(createError(400, err)))
					}
					handlers.unshift(bodyHandler)
				}

				const requiresValidation = !!requestBody || parameters

				if (requiresValidation && !responses["400"]) {
					throw Error(
						`Route ${pathString} ${verb} requires validation but does not have a 400 handler`
					)
				}

				route[verb](expressPath, handlers)
			}
		}
	})

	return route
}

const InputError = {
	type: "object",
	additionalProperties: false,
	required: ["errors", "message"],
	properties: {
		message: { type: "string" },
		errors: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				required: ["keyword", "dataPath", "schemaPath", "params"],
				properties: {
					keyword: { type: "string" },
					dataPath: { type: "string" },
					schemaPath: { type: "string" },
					params: { type: "object" },
					propertyName: { type: "string" },
					message: { type: "string" },
				},
			},
		},
	},
}

const InputErrorResponse = {
	description: "Bad Request",
	content: {
		"application/json": {
			schema: InputError,
		},
	},
}

module.exports = { Api, InputError, InputErrorResponse }
