import {
  ApolloClient,
  DocumentNode,
  HttpLink,
  InMemoryCache,
  split
} from '@apollo/client';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { WebSocketLink } from '@apollo/client/link/ws';
import { getMainDefinition } from '@apollo/client/utilities';

// NOTE: you can get the base URL with PageConfig
//       but at the moment this experiment runs without jhub/cylc-uiserver
// import { PageConfig } from '@jupyterlab/coreutils';
// const baseUrl = PageConfig.getBaseUrl();

const GRAPHQL_WS_ENDPOINT = 'ws://localhost:8000/user/kinow/subscriptions';
const GRAPHQL_HTTP_ENDPOINT = 'http://localhost:8000/user/kinow/graphql';

export default class WorkflowService {
  apolloClient: ApolloClient<any>;
  observable: ZenObservable.Subscription;

  constructor() {
    const httpLink = new HttpLink({
      uri: GRAPHQL_HTTP_ENDPOINT
    });
    const subscriptionClient = new SubscriptionClient(GRAPHQL_WS_ENDPOINT, {
      reconnect: true,
      lazy: false
    }, null);
    const wsLink = new WebSocketLink(subscriptionClient);
    const link = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
      },
      wsLink,
      httpLink
    );
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
    });
    /**
     * Observable for a merged query subscription.
     */
    this.observable = null;
  }

  /**
   * Perform a REST GraphQL request. The request will use the merged-query
   * as payload. Deltas are requested in a separate subscription/query,
   * due to issues merging `Workflow` subscriptions with `Delta` subscriptions.
   */
  request(query: DocumentNode, callback: CallableFunction) {
    if (!query) {
      throw new Error('Missing GraphQL query!');
    }
    if (this.observable !== null) {
      this.observable.unsubscribe();
      this.observable = null;
    }
    this.observable = this.apolloClient.subscribe({
      query: query,
      fetchPolicy: 'no-cache'
    }).subscribe(
      (response: any) => {
        callback(response.data.workflows);
      },
      (err: any) => {
        throw new Error(err.message);
      },
      () => {}
    );
  };
}
