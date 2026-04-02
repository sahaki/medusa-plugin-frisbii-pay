import { Module } from "@medusajs/framework/utils"
import FrisbiiDataModuleService from "./service"
import frisbiiDataLoader from "./loaders"

export const FRISBII_DATA_MODULE = "frisbiiData"

export default Module(FRISBII_DATA_MODULE, {
  service: FrisbiiDataModuleService,
  loaders: [frisbiiDataLoader],
})
