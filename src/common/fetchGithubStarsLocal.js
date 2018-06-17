// Dependencies
import axios from 'axios';
import { query, config } from './query';

const formatData = (results) => {
  return results.map(result => {
    return {
      login: result.node.login,
      starredAt: result.starredAt,
    }
  });
};

const formatRepo = (all, repo, stargazersData) => {
  const repoData = stargazersData[repo];
  const stargazers = repoData.stargazers;
  const url = repoData.url;
  const totalCount = stargazers.totalCount;
  const stars = stargazers.edges;
  const last = stars[stars.length - 1];
  const first = stars[0];
  const firstDate = new Date(first.starredAt);
  const lastDate = new Date(last.starredAt);
  const hasNextPage = stargazers.pageInfo.hasNextPage;
  const hasPreviousPage = stargazers.pageInfo.hasPreviousPage;

  all[repo] = [...formatData(stars), ...all[repo]];

  return {
    totalCount,
    url,
    stars: all[repo],
    lastCursor: last.cursor,
    firstCursor: first.cursor,
    hasNextPage,
    hasPreviousPage,
    lastTime: lastDate.getTime(),
    firstTime: firstDate.getTime(),
  };
};

const filterRepos = (reposData, repos, hours) => {
  const filteredRepos = {};
  const variables = {};
  let hasPreviousPage = false;
  Object.keys(repos).forEach((key, index) => {
    const repo = reposData[key];

    if (repo.hasPreviousPage && repo.firstTime > hours) {
      variables[`before${index}`] = repo.firstCursor;
      filteredRepos[key] = repos[key];
      hasPreviousPage = true;
    }
  });

  return {
    filteredRepos,
    hasPreviousPage,
    variables
  };
};

const fetchPage = async (counter, hours, limit, all, github, variables, repos, callback) => {
  const results = await github.post('graphql', { query: query(repos), variables });
  const stargazersData = await results.data.data;
  const reposData = {};
  if (stargazersData) {
    Object.keys(repos).forEach(key => {
      reposData[key] = formatRepo(all, key, stargazersData);
    });

    const filteredRepos = filterRepos(reposData, repos, hours);

    if (filteredRepos.hasPreviousPage && counter < limit) {
      variables = Object.assign(variables, filteredRepos.variables);
      await fetchPage(counter + 1, hours, limit, all, github, variables, filteredRepos.filteredRepos, callback);
    } else {
      callback(reposData);
    }
  } else {
    callback(reposData);
  }
};

const fetchGithubStars = async (GITHUB_TOKEN, limit = 5, hours) => {
  // Github GraphQL axios instance
  const github = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`
    }
  });

  const variables = {
    last: 100,
  };

  const all = {};
  Object.keys(config).forEach(key => {
    all[key] = [];
  });

  let page;
  await fetchPage(0, hours, limit, all, github, variables, config, (data) => {
    page = data;
  });

  return page;
};

export default fetchGithubStars;
