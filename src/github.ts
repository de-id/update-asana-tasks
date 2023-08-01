import * as core from '@actions/core';
import * as github from '@actions/github';

const githubToken = core.getInput('github-token');

const githubClient = github.getOctokit(githubToken);

function tagsListToPrNumbers(tagsList: string): number[] {
    return [];
}

export async function getPrDescriptions(prNumbers: number[]): Promise<string[]> {
    const requestPromises = prNumbers.map(pull_number =>
        githubClient.rest.pulls.get({
            pull_number,
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
        })
    );

    const results = await Promise.all(requestPromises);

    console.log(results.map(result => result.data));

    return [];
}
