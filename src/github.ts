import * as core from '@actions/core';
import * as github from '@actions/github';

const githubToken = core.getInput('github-token');

const githubClient = github.getOctokit(githubToken);

export async function getPrDescription(): Promise<string> {
    return github.context.payload.pull_request?.body || '';
}

export async function getPrDescriptionsForProd(): Promise<string[]> {
    const mainPullNumber = github.context.payload.pull_request?.number!;

    const commits = await githubClient.rest.pulls.listCommits({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: mainPullNumber,
    });

    console.log(commits.data.map(commit => commit.parents));

    return [];
}
