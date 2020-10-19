import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  split
} from '@apollo/client'
import { SubscriptionClient } from 'subscriptions-transport-ws'
import { WebSocketLink } from '@apollo/client/link/ws'
import { getMainDefinition } from '@apollo/client/utilities'

import ZenObservable from 'zen-observable'

const GRAPHQL_WS_ENDPOINT = "ws://localhost:8000/subscriptions"
const GRAPHQL_HTTP_ENDPOINT = "http://localhost:8000/graphql"

export default class WorkflowService {

  constructor() {
    const httpLink = new HttpLink({
      uri: GRAPHQL_HTTP_ENDPOINT
    })
    const subscriptionClient = new SubscriptionClient(GRAPHQL_WS_ENDPOINT, {
      reconnect: true,
      lazy: false
    }, null)
    const wsLink = new WebSocketLink(subscriptionClient)
    const link = split(
      ({ query }) => {
        const definition = getMainDefinition(query)
        return definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
      },
      wsLink,
      httpLink
    )
    this.apolloClient = new ApolloClient({
      link: link,
      cache: new InMemoryCache(),
      defaultOptions: {
        query: {
          fetchPolicy: 'no-cache',
          errorPolicy: 'all'
        },
        watchQuery: {
          fetchPolicy: 'no-cache',
          errorPolicy: 'all'
        }
      },
      connectToDevTools: true
    })
    /**
     * Observable for a merged query subscription.
     * @type {ZenObservable.Subscription}
     */
    this.observable = null
  }

  /**
   * Perform a REST GraphQL request. The request will use the merged-query
   * as payload. Deltas are requested in a separate subscription/query,
   * due to issues merging `Workflow` subscriptions with `Delta` subscriptions.
   */
  request (query, callback) {
    if (!query) {
      throw new Error('Missing GraphQL query!')
    }
    const vm = this
    if (this.observable !== null) {
      this.observable.unsubscribe()
      this.observable = null
    }
    this.observable = this.apolloClient.subscribe({
      query: query,
      fetchPolicy: 'no-cache'
    }).subscribe({
      next (response) {
        callback(response.data.workflows)
      },
      error (err) {
        throw new Error(err.message)
      },
      complete () {
      }
    })
  }
}
