import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { AdminUpdateFrisbiiConfig } from "./admin/frisbii/config/validators"

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
