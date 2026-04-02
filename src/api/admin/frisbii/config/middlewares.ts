import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { AdminUpdateFrisbiiConfig } from "./validators"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/frisbii/config",
      method: "POST",
      middlewares: [
        validateAndTransformBody(AdminUpdateFrisbiiConfig),
      ],
    },
  ],
})
