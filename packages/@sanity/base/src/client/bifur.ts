import type {ClientConfig, SanityClient} from '@sanity/client'
import {fromSanityClient} from '@sanity/bifur-client'
import {versionedClient} from './versionedClient'

export const bifur = fromSanityClient(
  // The global Sanity client is guaranteed to have a dataset, thus the type cast
  versionedClient.withConfig({
    apiVersion: '2022-06-30',
    ignoreBrowserTokenWarning: true,
  }) as SanityClient & {
    config(): ClientConfig & {dataset: string}
  }
)
