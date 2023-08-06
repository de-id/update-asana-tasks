import * as core from '@actions/core';
import * as github from '@actions/github';

const githubToken = core.getInput('github-token');

const githubRestClient = github.getOctokit(githubToken).rest;

export function getPrDescription(): string {
    return github.context.payload.pull_request?.body || '';
}

function extractPullNumberFromMessage(message: string): number | undefined {
    let pullNumberMatch;

    if (message.toLocaleLowerCase().startsWith('merge pull request')) {
        pullNumberMatch = message.match(/#\d+/)?.[0].slice(1);
    } else {
        pullNumberMatch = message.match(/\(#\d+\)/)?.[0].slice(2, -1);
    }

    if (pullNumberMatch) {
        return parseInt(pullNumberMatch);
    }
}

export async function getPrDescriptionsForProd(): Promise<string[]> {
    const mainPullNumber = github.context.payload.pull_request?.number!;

    const { data: commits } = await githubRestClient.pulls.listCommits({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: mainPullNumber,
    });

    const childPrNumbers = commits
        .map(({ commit }) => extractPullNumberFromMessage(commit.message))
        .filter(Boolean) as number[];

    console.log(`Found child PR numbers: ${JSON.stringify(childPrNumbers)}`);

    const getPrPromises = childPrNumbers.map(pull_number =>
        githubRestClient.pulls.get({
            pull_number,
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
        })
    );

    const getPrResults = await Promise.all(getPrPromises);

    return getPrResults
        .map(result => result.data.body)
        .filter(Boolean) as string[];
}
