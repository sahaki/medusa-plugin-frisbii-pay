import { ModuleProvider, Modules } from '@medusajs/framework/utils'
import FrisbiiPaymentProviderService from './service'

const FrisbiiPaymentProvider = ModuleProvider(Modules.PAYMENT, {
  services: [FrisbiiPaymentProviderService],
})

export default FrisbiiPaymentProvider
