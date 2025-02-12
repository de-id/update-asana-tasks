import * as core from '@actions/core';
import * as github from '@actions/github';

/**
 * We pull the GitHub token from inputs so we can call the GitHub REST API.
 * Make sure your workflow sets `github-token` as an input or environment variable.
 */
const githubToken = core.getInput('github-token');

/**
 * We create a GitHub REST client from the token,
 * so we can make calls like listComments, createComment, etc.
 */
const githubRestClient = github.getOctokit(githubToken).rest;

/**
 * Returns the Pull Request number from the current GitHub Action context
 * or 0 if it's not found (e.g., in a non-PR event).
 */
export function getPrNumber(): number {
    return github.context.payload.pull_request?.number || 0;
}

/**
 * Returns the Pull Request body (description) from the Action context
 * or an empty string if it’s not available.
 */
export function getPrDescription(): string {
    return github.context.payload.pull_request?.body || '';
}

/**
 * Extracts a child PR number from a commit message if it looks like:
 * - "Merge pull request #123" or
 * - Something with (#123) in parentheses
 */
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

/**
 * Exported convenience: the repository name from the context, e.g. "my-repo".
 */
export function getRepo(): string {
    return github.context.repo.repo;
}

/**
 * Creates a clickable Slack/Markdown link for the current PR,
 * e.g. <http://github.com/owner/repo/pull/123|PR #123>
 */
export function getPrLink(): string {
    const prNum = getPrNumber();
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    return `<http://github.com/${owner}/${repo}/pull/${prNum}|#${prNum}>`;
}

/**
 * A convenience for referencing just the repo name, if needed externally.
 */
export const repo = github.context.repo.repo;

/**
 * The target branch for this PR (e.g. "master", "staging", "prod").
 */
export const targetBranch = github.context.payload.pull_request?.base.ref;

/**
 * Fetches ALL commits from a given PR (since GitHub paginates them).
 * We loop over pages until there are no more commits to fetch.
 */
async function fetchAllCommits(
    githubRestClient: any,
    owner: string,
    repo: string,
    pull_number: number
): Promise<any[]> {
    let allCommits: any[] = [];
    let page = 1;
    const per_page = 100; // Max allowed per page

    while (true) {
        const { data: commits } = await githubRestClient.pulls.listCommits({
            owner,
            repo,
            pull_number,
            per_page,
            page,
        });

        allCommits = allCommits.concat(commits);

        if (commits.length < per_page) {
            break; // No more pages left to fetch
        }
        page++;
    }

    return allCommits;
}

/**
 * Finds any "child" PR numbers referenced in the commits of the main PR,
 * fetches each child PR's body (description), and returns them in an array.
 */
export async function getPrDescriptionsForProd(): Promise<
    { prNumber: number; description: string }[]
> {
    const mainPullNumber = github.context.payload.pull_request?.number!;
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;

    const commits = await fetchAllCommits(
        githubRestClient,
        owner,
        repo,
        mainPullNumber
    );

    console.log(`All commits of PR #${mainPullNumber} are:`, commits);

    const childPrNumbers = commits
        .map(({ commit }) => extractPullNumberFromMessage(commit.message))
        .filter(Boolean) as number[];

    console.log(`Found child PR numbers: ${JSON.stringify(childPrNumbers)}`);

    const getPrPromises = childPrNumbers.map(async pull_number => {
        const { data: childPr } = await githubRestClient.pulls.get({
            owner,
            repo,
            pull_number,
        });
        return {
            prNumber: pull_number,
            description: childPr.body || '',
        };
    });

    return Promise.all(getPrPromises);
}

/* ------------------------------------------------------------------
 * Generic Hidden Comment Storage
 * ------------------------------------------------------------------
 * These two functions let you store and retrieve data in hidden PR
 * comments, e.g.:
 *     <!-- store-data: key=slack-thread-id, value=12345.6789 -->
 * That way, we can keep track of ephemeral data (like Slack ts).
 */

/**
 * Stores a key–value pair in a hidden PR comment, e.g.:
 *     <!-- store-data: key=slack-thread-id, value=12345.6789 -->
 */
export async function storeDataInHiddenComment(
    prNumber: number,
    dataKey: string,
    dataValue: string
): Promise<void> {
    const ghClient = github.getOctokit(core.getInput('github-token'));
    const { owner, repo } = github.context.repo;

    const body = `<!-- store-data: key=${dataKey}, value=${dataValue} -->`;

    await ghClient.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
    });
}

/**
 * Searches PR comments to find a matching hidden comment with
 * your specified key, e.g. 'slack-thread-id'. If found, returns
 * the stored value.
 */
export async function findDataInHiddenComments(
    prNumber: number,
    dataKey: string
): Promise<string | undefined> {
    const ghClient = github.getOctokit(core.getInput('github-token'));
    const { owner, repo } = github.context.repo;

    const { data: comments } = await ghClient.rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
        per_page: 100,
    });

    const marker = `<!-- store-data: key=${dataKey}, value=`;
    for (const comment of comments) {
        const body = comment.body || '';
        if (body.includes(marker)) {
            // Match the entire line: <!-- store-data: key=DATA_KEY, value=VALUE -->
            const regex = new RegExp(
                `<!-- store-data: key=${dataKey}, value=(.+) -->`
            );
            const match = body.match(regex);
            if (match && match[1]) {
                return match[1];
            }
        }
    }

    return undefined;
}
