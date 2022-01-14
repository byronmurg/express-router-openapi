const expressRouterOpenapi = require("../index")
const express = require("express")

const app = express()

app.use(express.json())

const spec = {
  openapi: "3",

  paths: {
    "/foo": {
      get: {
        description: "Just return the bar query parameter",
        parameters: [
          {
            name: "bar",
            in: "query",
            schema: { type:"string", minLength:3, maxLength:16 },
			required: true,
          }
        ],
        $express(req, res) {
          res.json(req.query.bar)
        },
        responses: {
          "200": {
            description: "The input bar parameter",
            content: {
              "application/json": {
                schema: { type:"string", minLength:3, maxLength:16 }
              }
            }
          },
          "400": expressRouterOpenapi.InputErrorResponse,
        }
      }
    }
  }
}

app.use("/api", expressRouterOpenapi.Api(spec))

app.use((err, req, res, next) => {
	res.status(err.status || 500).json(err)
})

app.listen(5000)
