const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {

    const inputs = {
      token: core.getInput('repo-token', {required: true}),
    }

    const title = github.context.payload.pull_request.title;
    core.info(title);
    const isAdhoc = title.includes('ADHOC') || title.includes('STORYBOOK');
    if (isAdhoc) {
      core.warning("PR is adhoc or storybook -- no updates made"); 
      return;
    }

    core.info(title);
    const matches = title.match(/(\w+-\d+)/)
    if (!(matches)) {
      core.warning("Jira ticket not in PR title");
      return;
    }
    const jiraTicketKey = matches[0];
    core.info(`Jira Ticket Key: ${jiraTicketKey}`);
    const body = github.context.payload.pull_request.body;
    core.info(body);
    if (body.includes(jiraTicketKey)) {
      core.warning('PR body is prefixed already - no updates made');
      return;
    }

    const request = {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: github.context.payload.pull_request.number,
    }

    linkRegex = /^(?=.*?\bJIRA\b)(?=.*?\bticket\b).*$/
    lineToAdd = `:ticket: [JIRA ticket](https://notarize.atlassian.net/browse/${jiraTicketKey})`
    lineExists = body.match(linkRegex)
    if (lineExists) {
      core.info("Line exists in PR body without ticket");
      request.body = body.replace(linkRegex, lineToAdd)
    } else {
      core.info("Adding line to PR body");
      request.body = lineToAdd.concat('\n', body);
    }

    core.debug(`new body: ${request.body}`)

    const client = new github.GitHub(inputs.token);
    const response = await client.pulls.update(request);

    core.info(`response: ${response.status}`);
    if (response.status !== 200) {
      core.error('Updating the pull request has failed');
    }
  }
  catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

run()