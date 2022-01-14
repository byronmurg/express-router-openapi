
function translateParameterLocation(loc) {
	if (loc === "path") {
		return "params"
	} else if (loc === "query") {
		return "query"
	} else if (loc === "cookie") {
		return "cookies"
	} else {
		throw Error("Unknown parameter location (in) :"+ loc)
	}
}

function parametersToJsonschema(parameters = []) {

	const jsonschema = {
		type: "object",
		required: ["params", "query"],
		additionalProperties: false,
		properties: {
			query: {
				type: "object",
				required: [],
				properties: {},
				additionalProperties: false
			},
			cookies: {
				type: "object",
				required: [],
				properties: {},
			},
			params: {
				type: "object",
				required: [],
				properties: {},
				additionalProperties: false
			}
		}
	}

	for (const parameter of parameters) {
		const { name, required, schema={} } = parameter
		const loc = translateParameterLocation(parameter.in)

		jsonschema.properties[loc].properties[name] = schema
		if (parameter.required)
			jsonschema.properties[loc].required.push(name)
	}

	return jsonschema
}

module.exports = parametersToJsonschema
