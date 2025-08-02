import { ApolloClient, InMemoryCache, from } from '@apollo/client';
import { RestLink } from 'apollo-link-rest';

// Get environment variables
const DISCOURSE_BASE_URL = process.env.EXPO_PUBLIC_DISCOURSE_BASE_URL || 'https://meta.techrebels.info';
const DISCOURSE_API_KEY = process.env.EXPO_PUBLIC_DISCOURSE_API_KEY;
const DISCOURSE_API_USERNAME = process.env.EXPO_PUBLIC_DISCOURSE_API_USERNAME;

// Create RestLink for Discourse API
const restLink = new RestLink({
  uri: DISCOURSE_BASE_URL,
  headers: {
    'Api-Key': DISCOURSE_API_KEY || '',
    'Api-Username': DISCOURSE_API_USERNAME || '',
    'Content-Type': 'application/json',
    'User-Agent': 'FomioMobile/1.0'
  },
  // Custom serializer for REST responses
  customFetch: (uri, options) => {
    console.log('🔗 Apollo RestLink Request:', {
      url: uri,
      method: options?.method || 'GET',
      hasAuth: !!(DISCOURSE_API_KEY && DISCOURSE_API_USERNAME)
    });
    
    return fetch(uri, options);
  }
});

// Configure Apollo Client
export const apolloClient = new ApolloClient({
  link: from([restLink]),
  cache: new InMemoryCache({
    typePolicies: {
      // Cache policies for Discourse entities
      HotByte: {
        keyFields: ['id'],
        fields: {
          // Cache hot bytes for 5 minutes
          created_at: {
            read(existing) {
              return existing;
            }
          }
        }
      },
      Category: {
        keyFields: ['id'],
        fields: {
          topic_count: {
            read(existing) {
              return existing;
            }
          }
        }
      },
      Topic: {
        keyFields: ['id'],
        fields: {
          posts_count: {
            read(existing) {
              return existing;
            }
          }
        }
      },
      Post: {
        keyFields: ['id'],
        fields: {
          updated_at: {
            read(existing) {
              return existing;
            }
          }
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network'
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first'
    }
  }
});

// Export client as default
export default apolloClient;

// Helper function to check if Apollo Client is properly configured
export const isApolloConfigured = (): boolean => {
  return !!(DISCOURSE_API_KEY && DISCOURSE_API_USERNAME);
};

// Helper function to get configuration status
export const getApolloConfig = () => {
  return {
    baseUrl: DISCOURSE_BASE_URL,
    hasApiKey: !!DISCOURSE_API_KEY,
    hasApiUsername: !!DISCOURSE_API_USERNAME,
    isConfigured: isApolloConfigured()
  };
};

