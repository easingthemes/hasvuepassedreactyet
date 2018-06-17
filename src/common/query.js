// GraphQL query for Github API (https://developer.github.com/v4/)
export const config = {
  react: 'facebook',
  vue: 'vuejs'
};

const queryRepo = (owner, name, before) => `
  ${name}: repository(owner: "${owner}", name: "${name}") {
    url
    stargazers
    (
      last: $last, 
      before: ${before}
    ) {
      totalCount
      edges {
        cursor
        starredAt
        node {
          login
          id
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
      }
    }
  }
`;

export const query = (repos) => {
  const variables = Object.keys(repos).map((repo, index) => {
    return `$before${index}: String`;
  }).join(',');
  return `query stargazerQuery($last: Int, ${variables}) {
    ${Object.keys(repos).map((repo, index) => queryRepo(config[repo], repo, `$before${index}`)).join('')}
  }`;
};
