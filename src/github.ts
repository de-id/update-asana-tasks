import * as core from '@actions/core';
import * as github from '@actions/github';

const githubToken = core.getInput('github-token');

const githubClient = github.getOctokit(githubToken);

function tagsListToPrNumbers(tagsList: string): number[] {
    return [];
}

async function getPrDescriptions(prNumbers: number[]): Promise<string[]> {
    const requestPromises = prNumbers.map(pull_number =>
        githubClient.rest.pulls.get({
            pull_number,
            owner: '',
            repo: '',
        })
    );

    return [];
}
