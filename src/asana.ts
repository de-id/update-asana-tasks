import axios from 'axios';
import * as core from '@actions/core';

const asanaBaseUrl = 'https://app.asana.com/api/1.0/tasks/';

enum CustomFields {
    QaStatus = '1149901879873102',
}

export enum QaStatus {
    Review = '1153933847862684',
    Staging = '1149901879873105',
    Prod = '1149901879873107',
}

type TaskTitleAndAssignee = {
    assignee: string;
    title: string;
};

const asanaPat = core.getInput('asana-pat');

export async function updatePrTaskStatuses(
    prDescription: string,
    status: QaStatus
) {
    const { taskIds } = getTaskIdsAndUrlsFromPr(prDescription);
    await Promise.all(taskIds.map(taskGid => updateQaStatus(taskGid, status)));
}

export function getTaskIdsAndUrlsFromPr(prDescription: string): {
    taskIds: string[];
    taskUrls: string[];
} {
    const asanaUrlRegex = /https:\/\/app\.asana\.com\/0\/\d+\/\d+/g;

    const taskUrls = [...prDescription.matchAll(asanaUrlRegex)].map(
        match => match[0]
    );

    if (!taskUrls.length) {
        console.log('Asana task URL not found in PR description');
        return { taskIds: [], taskUrls: [] };
    }

    const taskIds = taskUrls.map(taskUrl => {
        const taskGidMatch = taskUrl.match(/\/(\d+)$/);
        return taskGidMatch ? taskGidMatch[1] : 'not-found';
    });

    return { taskIds, taskUrls };
}

export async function getTaskDetailsFromPr(prDescription: string): Promise<{
    taskIds: string[];
    taskUrls: string[];
    taskTitleAndAssigneeArray: TaskTitleAndAssignee[];
}> {
    // Extract task IDs and URLs using the existing function
    const { taskIds, taskUrls } = getTaskIdsAndUrlsFromPr(prDescription);

    if (!taskIds.length) {
        console.log(
            'No valid Asana task IDs found in PR description',
            prDescription
        );
        return { taskIds: [], taskUrls: [], taskTitleAndAssigneeArray: [] };
    }

    // Fetch task titles for each task ID
    const asanaPat = core.getInput('asana-pat');
    const taskTitleAndAssigneeArray: TaskTitleAndAssignee[] = await Promise.all(
        taskIds.map(async taskGid => {
            try {
                const response = await axios.get(`${asanaBaseUrl}${taskGid}`, {
                    headers: {
                        Authorization: `Bearer ${asanaPat}`,
                    },
                });
                return {
                    title: response.data?.data?.name || 'Unknown Task Title',
                    assignee: response.data?.data?.assignee || 'Unassgined',
                };
            } catch (error: any) {
                console.error(
                    `Failed to fetch title for task ID ${taskGid}:`,
                    error?.message
                );
                return {
                    title: 'Unknown Task Title',
                    assignee: 'Unassgined',
                };
            }
        })
    );

    return { taskIds, taskUrls, taskTitleAndAssigneeArray };
}

function updateQaStatus(taskGid: string, status: QaStatus) {
    return axios.put(
        asanaBaseUrl + taskGid,
        {
            data: {
                custom_fields: {
                    [CustomFields.QaStatus]: status,
                },
            },
        },
        {
            headers: {
                Authorization: `Bearer ${asanaPat}`,
            },
        }
    );
}
