# express-router-openapi
Generate express-js routes with openapi spec

Define input validation using OpenAPI schema format. Do away with boring and error-prone validation checking while creating a self-describing api.

Javascript logic is defined by the `$express` key in the method block which can be either a function or array of functions following express callback format.

## example
Here is a basic example that just responds with whatever you send as
the `bar` query parameter.

```js
const expressRouterOpenapi = require("express-router-openapi")
const express = require("express")

const app = express()
app.use(express.json()) //Enable json input

const spec = {
  openapi: "3",

  paths: {
    "/foo": {
      get: {
        operationId: "foo",
        description: "Just return the bar query parameter",
        parameters: [
          {
            name: "bar",
            in: "query",
            schema: { type:"string", minLength:3, maxLength:16 },
            required: true,
          }
        ],
        // This is where the actual handler goes.
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
```

now browse to `http://localhost:5000/api/foo` and you will get a 400 error.
but `http://localhost:5000/api/foo?bar=hi` will return successfully.

also if you browse to `http://localhost:5000/api/schema.json` you can get the unresolved openapi shema.

## References
json references will be resolved automatically for validation, meaning that you can
use the component structure of openapi.

For example:
```js
const spec = {
  paths: {
    "/foo":{
      post: {
        $express(req, res) {
          req.json(req.body)
        },
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref:"#/components/schemas/MyClass" }
            }
          }
        },
        responses: {
          200: { $ref:"#/components/responses/MyClassResponse" }
        }
      }
    }
  },
  components: {
    responses: {
      MyClassResponse: {
        ....
      }
    },
    schemas: {
      MyClass: {
        type:"object",
        properties: {
          foo: { type:"string" }
        }
      }
    }
  }
}
```
