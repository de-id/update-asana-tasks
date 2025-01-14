import * as core from '@actions/core';
import * as github from '@actions/github';

const githubToken = core.getInput('github-token');

const githubRestClient = github.getOctokit(githubToken).rest;

export function getPrNumber(): number {
    return github.context.payload.pull_request?.number || 0;
}

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

export const getRepo = () => github.context.repo.repo;
export const getPrLink = () =>
    `http://github.com/de-id/${github.context.repo.repo}/pull/${github.context
        .payload.pull_request?.number!}`;

export async function getPrDescriptionsForProd(): Promise<
    { prNumber: number; description: string }[]
> {
    const mainPullNumber = github.context.payload.pull_request?.number!;

    const { data: commits } = await githubRestClient.pulls.listCommits({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: mainPullNumber,
    });

    console.log(`all commits of pr ${mainPullNumber} are`, commits);

    const childPrNumbers = commits
        .map(({ commit }) => extractPullNumberFromMessage(commit.message))
        .filter(Boolean) as number[];

    console.log(`Found child PR numbers: ${JSON.stringify(childPrNumbers)}`);

    const getPrPromises = childPrNumbers.map(async pull_number => ({
        description:
            (
                await githubRestClient.pulls.get({
                    pull_number,
                    owner: github.context.repo.owner,
                    repo: github.context.repo.repo,
                })
            ).data.body || '',
        prNumber: pull_number,
    }));

    return Promise.all(getPrPromises);
}
