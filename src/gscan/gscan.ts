import Vue from 'vue';
import Component from 'vue-class-component';
import { mdiHelpCircle, mdiPauseOctagon, mdiPlayCircle } from '@mdi/js';

import Job from './job';
import WorkflowService from './service';
import gql from 'graphql-tag';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const compiler = require('vue-template-compiler');

const GSCAN_QUERY = `
subscription {
  workflows {
    id
    name
    status
    owner
    host
    port
    taskProxies(sort: { keys: ["cyclePoint"] }) {
      id
      name
      state
      cyclePoint
      latestMessage
      task {
        meanElapsedTime
        name
      }
      jobs(sort: { keys: ["submit_num"], reverse:true }) {
        id
        batchSysName
        batchSysJobId
        host
        startedTime
        submittedTime
        finishedTime
        state
        submitNum
      }
    }
  }
}
`;

function getWorkflowSummary(workflow: any): Map<any, any> {
  const states = new Map();
  // a stopped workflow, may not have any tasks
  if (workflow.taskProxies) {
    for (const taskProxy of workflow.taskProxies) {
      // a task in waiting, may not have any jobs
      if (taskProxy.jobs) {
        for (const job of taskProxy.jobs) {
          // TODO: temporary fix, as the backend is sending ready jobs, but they will change in cylc flow&uiserver in the future
          if (job.state === 'ready') {
            continue;
          }
          if (!states.has(job.state)) {
            states.set(job.state, new Set());
          }
          states
            .get(job.state)
            .add(`${taskProxy.name}.${taskProxy.cyclePoint}`);
        }
      }
    }
    for (const [stateName, tasksSet] of states.entries()) {
      states.set(stateName, [...tasksSet].sort());
    }
  }
  return new Map([...states.entries()].sort());
}

const workflowService = new WorkflowService();

const TEMPLATE = `
<div>
  <div
    class="c-gscan"
  >
    <div
      v-if="workflows && workflows.length > 0"
      class="c-gscan-workflows"
    >
      <div
        v-for="workflow in sortedWorkflows"
        :key="workflow.id"
        class="c-gscan-workflow"
      >
        <v-list-item
          :to="\`/workflows/\${workflow.name}\`"
          :class="getWorkflowClass(workflow.status)"
        >
          <v-list-item-action>
            <v-icon>{{ getWorkflowIcon(workflow.status) }}</v-icon>
          </v-list-item-action>
          <v-list-item-title>
            <v-layout align-center align-content-center wrap>
              <v-flex grow>{{ workflow.name }}</v-flex>
              <v-flex shrink ml-4>
                <!-- task summary tooltips -->
                <span
                  v-for="[state, tasks] in workflowsSummaries.get(workflow.name).entries()"
                  :key="\`\${workflow.name}-summary-\${state}\`"
                >
                  <v-tooltip color="black" top>
                    <template v-slot:activator="{ on }">
                      <!-- a v-tooltip does not work directly set on Cylc job component, so we use a dummy button to wrap it -->
                      <!-- NB: most of the classes/directives in these button are applied so that the user does not notice it is a button -->
                      <v-btn
                        v-on="on"
                        class="mt-1 pa-0"
                        min-width="0"
                        min-height="0"
                        style="font-size: 120%"
                        :ripple="false"
                        small
                        dark
                        text
                      >
                        <job :status="state" />
                      </v-btn>
                    </template>
                    <!-- tooltip text -->
                    <span>
                      <span class="grey--text">Recent {{ state }} tasks:</span>
                      <br/>
                      <span v-for="(task, index) in tasks.slice(0, maximumTasksDisplayed)" :key="index">
                        {{ task }}<br v-if="index !== tasks.length -1" />
                      </span>
                      <span v-if="tasks.length > maximumTasksDisplayed" class="font-italic">And {{ tasks.length - maximumTasksDisplayed }} more</span>
                    </span>
                  </v-tooltip>
                </span>
              </v-flex>
            </v-layout>
          </v-list-item-title>
        </v-list-item>
      </div>
    </div>
    <!-- when no workflows are returned in the GraphQL query -->
    <div v-else>
      <v-list-item>
        <v-list-item-title class="grey--text">No workflows found</v-list-item-title>
      </v-list-item>
    </div>
  </div>
</div>
`;

@Component({
  components: {
    Job
  },
  render(createElement: any, context: any): any {
    const { render } = compiler.compileToFunctions(TEMPLATE);
    return render(createElement, {});
  }
})
export default class GScan extends Vue {
  // data
  workflows: any[] = [];
  viewID = '';
  subscriptions = {};
  isLoading = true;
  maximumTasksDisplayed = 5;
  svgPaths = {
    running: mdiPlayCircle,
    held: mdiPauseOctagon,
    unknown: mdiHelpCircle
  };

  // computed
  get sortedWorkflows(): Array<any> {
    return [...this.workflows].sort((left, right) => {
      if (left.status !== right.status) {
        if (left.status === 'stopped') {
          return 1;
        }
        if (right.status === 'stopped') {
          return -1;
        }
      }
      return left.name
        .toLowerCase()
        .localeCompare(right.name.toLowerCase(), undefined, {
          numeric: true,
          sensitivity: 'base'
        });
    });
  }

  get workflowsSummaries(): Map<string, any> {
    const workflowSummaries = new Map();
    // with async scan, the workflows list may be null or undefined
    // see cylc-uiserver PR#150
    if (this.workflows) {
      for (const workflow of this.workflows) {
        workflowSummaries.set(workflow.name, getWorkflowSummary(workflow));
      }
    }
    return workflowSummaries;
  }

  // methods
  setActive(isActive: boolean): void {
    this.isLoading = !isActive;
  }

  getWorkflowIcon(status: string): string {
    switch (status) {
      case 'running':
        return this.svgPaths.running;
      case 'held':
        return this.svgPaths.held;
      default:
        return this.svgPaths.unknown;
    }
  }

  getWorkflowClass(status: string): any {
    return {
      'c-workflow-stopped': status === 'stopped'
    };
  }

  // lifecycle hooks
  created(): void {
    workflowService.request(
      gql(GSCAN_QUERY),
      (workflows: Record<string, any>[]) => {
        this.workflows = workflows;
      }
    );
  }

  beforeDestroy(): void {
    if (workflowService.observable !== null) {
      workflowService.observable.unsubscribe();
    }
  }
}
