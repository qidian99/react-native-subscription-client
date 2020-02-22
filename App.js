/* eslint-disable react-native/no-inline-styles */
import React, {Component} from 'react';
import {View, Text} from 'react-native';
import gql from 'graphql-tag';
import {compose} from 'redux';
import {ApolloProvider, useSubscription, graphql} from 'react-apollo';

let notSubscribed = true;
class DefaultView extends Component {
  state = {
    posts: [],
  };

  componentDidUpdate(prevProps, prevState) {
    const obj = {};
    if (this.props.subscribeToMore && notSubscribed) {
      notSubscribed = false;
      obj.unsubscribe = this.props.subscribeToMore({
        document: POST_SUBSCRIPTION,
        updateQuery: (prev, {subscriptionData}) => {
          console.log(prev, subscriptionData);
          if (!subscriptionData.data) {
            return prev;
          }
          console.log('New data fetched: ', subscriptionData);
          // Post List {"data": {"postAdded": {"__typename": "Post", "author": "test1", "comment": "sb1"}}}
          const {
            data: {postAdded},
          } = subscriptionData;
          this.setState({posts: [...this.state.posts, postAdded]});
        },
      });
    }

    if (!prevProps.posts && this.props.posts) {
      console.log('POPULATING STATE', this.props.posts);
      this.setState({posts: this.props.posts});
    }
  }

  render() {
    const {posts} = this.state;
    console.log('STATE', posts);
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        {posts.map(post => {
          const {author, comment} = post;
          return (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={{flex: 1 / 2}}>{`Author: ${author}`}</Text>
              <Text style={{flex: 1 / 2}}>{`Comment: ${comment}`}</Text>
            </View>
          );
        })}
      </View>
    );
  }
}

const POST_QUERY = gql`
  query posts {
    posts {
      author
      comment
    }
  }
`;

const POST_SUBSCRIPTION = gql`
  subscription {
    postAdded {
      author
      comment
    }
  }
`;

export default compose(
  graphql(POST_QUERY, {
    props: ({
      data: {
        called,
        error,
        fetchMore,
        loading,
        networkStatus,
        refetch,
        startPolling,
        stopPolling,
        subscribeToMore,
        variables,
        updateQuery,
        posts,
      },
    }) => {
      console.log('Fetched data', posts);
      return {
        posts,
        subscribeToMore,
      };
    },
  }),
)(DefaultView);
