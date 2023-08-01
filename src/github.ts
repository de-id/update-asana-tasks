import * as core from '@actions/core';
import * as github from '@actions/github';

const githubToken = core.getInput('github-token');

const githubClient = github.getOctokit(githubToken);

function tagsListToPrNumbers(tagsList: string): number[] {
    const tags = tagsList.split('\n');

    return tags
        .map(tag => tag.split('-')[1])
        .filter(Boolean)
        .map(prString => parseInt(prString.split('.')[1]))
        .filter(parsedNumber => !isNaN(parsedNumber));
}

export async function getPrDescriptions(tagsList: string): Promise<string[]> {
    const prNumbers = tagsListToPrNumbers(tagsList);

    const requestPromises = prNumbers.map(pull_number =>
        githubClient.rest.pulls.get({
            pull_number,
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
        })
    );

    const results = await Promise.all(requestPromises);

    const descriptions = results.map(result => result.data.body).filter(Boolean) as string[];

    return descriptions;
}
