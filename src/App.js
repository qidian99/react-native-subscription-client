import React, {Component} from 'react';
import {View} from 'react-native';
import {split} from 'apollo-link';
import {HttpLink} from 'apollo-link-http';
import {WebSocketLink} from 'apollo-link-ws';
import {getMainDefinition} from 'apollo-utilities';
import {ApolloProvider, useSubscription, graphql} from 'react-apollo';
import {onError} from 'apollo-link-error';
import {ApolloLink, Observable} from 'apollo-link';
import {ApolloClient} from 'apollo-client';
import {withClientState} from 'apollo-link-state';
import {InMemoryCache} from 'apollo-cache-inmemory';
import AsyncStorage from '@react-native-community/async-storage';
import gql from 'graphql-tag';
import {compose} from 'redux';

import DefaultView from '../App';

// Create an http link:
const httpLink = new HttpLink({
  uri: 'http://localhost:4000',
});

// Create a WebSocket link:
const wsLink = new WebSocketLink({
  uri: 'ws://localhost:4000/graphql',
  options: {
    reconnect: true,
  },
});

// using the ability to split links, you can send data to each link
// depending on what kind of operation is being sent
const link = split(
  // split based on operation type
  ({query}) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

const cache = new InMemoryCache({
  cacheRedirects: {
    Query: {
      movie: (_, {id}, {getCacheKey}) => getCacheKey({__typename: 'Movie', id}),
    },
  },
});

const request = async operation => {
  const token = await AsyncStorage.getItem('token');
  operation.setContext({
    headers: {
      authorization: token,
    },
  });
};

const requestLink = new ApolloLink(
  (operation, forward) =>
    new Observable(observer => {
      let handle;
      Promise.resolve(operation)
        .then(oper => request(oper))
        .then(() => {
          handle = forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });
        })
        .catch(observer.error.bind(observer));

      return () => {
        if (handle) {
          handle.unsubscribe();
        }
      };
    }),
);

const client = new ApolloClient({
  link: ApolloLink.from([
    onError(({graphQLErrors, networkError}) => {
      if (graphQLErrors) {
        graphQLErrors.forEach(({message, locations, path}) =>
          console.log(
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
          ),
        );
      }
      if (networkError) {
        console.log(`[Network error]: ${networkError}`);
      }
    }),
    requestLink,
    withClientState({
      defaults: {
        isConnected: true,
      },
      resolvers: {
        Mutation: {
          updateNetworkStatus: (_, {isConnected}, {cache}) => {
            cache.writeData({data: {isConnected}});
            return null;
          },
        },
      },
      cache,
    }),
    link,
  ]),
  cache,
});

const COMMENTS_SUBSCRIPTION = gql`
  subscription onCommentAdded($repoFullName: String!) {
    commentAdded(repoFullName: $repoFullName) {
      id
      content
    }
  }
`;

function DontReadTheComments({repoFullName}) {
  const {
    data: {commentAdded},
    loading,
  } = useSubscription(COMMENTS_SUBSCRIPTION, {variables: {repoFullName}});
  console.log('subscription', commentAdded);
  // return <h4>New comment: {!loading && commentAdded.content}</h4>;
}

class App extends Component {
  render() {
    return (
      <ApolloProvider client={client}>
        <DefaultView />
      </ApolloProvider>
    );
  }
}

export default App;
