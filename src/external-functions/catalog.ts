import type { ExternalFunctionRegistration } from '../runtime/functions/external-function-registry'
import { externalLibraryFunctionRegistrations } from '../external-libraries/catalog'

export const externalFunctionRegistrations: ExternalFunctionRegistration[] =
  externalLibraryFunctionRegistrations
