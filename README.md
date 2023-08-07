# D-ID Update Asana Tasks

A GitHub action for handling our internal GitHub <> Asana flow.

## Usage

```
steps:
    - name: Update Asana tasks
    uses: de-id/update-asana-tasks@v1.3
    with:
        asana-pat: ${{ secrets.ASANA_PAT }}
        github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

is-review:
default: false
asana-pat:
required: true
github-token:
required: true

| Name           | Description                                                    | Is Required | Default |
| -------------- | -------------------------------------------------------------- | ----------- | ------- |
| `is-review`    | Is the action used for new PR (Task will move to "In Review")  | No          | False   |
| `asana-pat`    | Asana PAT (Stored in our secrets, can be generated from Asana) | Yes         | -       |
| `github-token` | -> secrets.GITHUB_TOKEN                                        | Yes         | -       |

### Outputs

_This action currently has no outputs_

## Developer Instructions

In order to publish a new version, run the following commands:

```
yarn build

git add .

git commit ...

git tag -am '<description>' v<semver>

git push
```
