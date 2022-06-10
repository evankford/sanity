import {SanityDocument, ConditionalProperty} from '@sanity/types'
import {useMemo} from 'react'
import {useCurrentUser} from '../datastores'
import {useUnique} from '../util/useUnique'
import {omitDeprecatedRole, useCheckCondition} from './utils'

/**
 * @internal Not yet a stable API
 */
export interface ConditionalPropertyProps {
  parent?: unknown
  value: unknown
  document?: SanityDocument
  checkProperty: ConditionalProperty
  checkPropertyKey: string
}

/**
 * Resolve a callback function to a boolean using the passed arguments
 *
 * @internal Not yet a stable API
 */
const useConditionalProperty = (props: ConditionalPropertyProps): boolean => {
  const {checkProperty = false, checkPropertyKey, document, parent, value: valueProp} = props
  const value = useUnique(valueProp)
  const currentUser = useCurrentUser()

  const isPropertyTruthy = useCheckCondition(checkProperty, checkPropertyKey, {
    currentUser,
    document,
    parent,
    value,
  })

  return isPropertyTruthy
}

export {useConditionalProperty as unstable_useConditionalProperty}