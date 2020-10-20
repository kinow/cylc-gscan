import Vue from 'vue';
import Component from 'vue-class-component';
import { mdiHelpCircle, mdiPauseOctagon, mdiPlayCircle } from '@mdi/js';

import Job from './job';
import WorkflowService from './service';
import gql from 'graphql-tag';

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
`

function getWorkflowSummary (workflow: any) {
  const states = new Map()
  // a stopped workflow, may not have any tasks
  if (workflow.taskProxies) {
    for (const taskProxy of workflow.taskProxies) {
      // a task in waiting, may not have any jobs
      if (taskProxy.jobs) {
        for (const job of taskProxy.jobs) {
          // TODO: temporary fix, as the backend is sending ready jobs, but they will change in cylc flow&uiserver in the future
          if (job.state === 'ready') {
            continue
          }
          if (!states.has(job.state)) {
            states.set(job.state, new Set())
          }
          states.get(job.state).add(`${taskProxy.name}.${taskProxy.cyclePoint}`)
        }
      }
    }
    for (const [stateName, tasksSet] of states.entries()) {
      states.set(stateName, [...tasksSet].sort())
    }
  }
  return new Map([...states.entries()].sort())
}

const workflowService = new WorkflowService()

@Component({
  components: {
    Job
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
  get sortedWorkflows() {
    return [...this.workflows].sort((left, right) => {
      if (left.status !== right.status) {
        if (left.status === 'stopped') {
          return 1
        }
        if (right.status === 'stopped') {
          return -1
        }
      }
      return left.name.toLowerCase()
        .localeCompare(
          right.name.toLowerCase(),
          undefined,
          { numeric: true, sensitivity: 'base' })
    })
  }

  get workflowsSummaries() {
    const workflowSummaries = new Map();
    // with async scan, the workflows list may be null or undefined
    // see cylc-uiserver PR#150
    if (this.workflows) {
      for (const workflow of this.workflows) {
        workflowSummaries.set(workflow.name, getWorkflowSummary(workflow))
      }
    }
    return workflowSummaries
  }

  // methods
  setActive (isActive: boolean) {
    this.isLoading = !isActive
  }

  getWorkflowIcon (status: string) {
    switch (status) {
      case 'running':
        return this.svgPaths.running
      case 'held':
        return this.svgPaths.held
      default:
        return this.svgPaths.unknown
    }
  }

  getWorkflowClass (status: string) {
    return {
      'c-workflow-stopped': status === 'stopped'
    }
  }

  // lifecycle hooks
  created () {
    const vm = this
    workflowService.request(gql(GSCAN_QUERY), (workflows: Object[]) => {
      vm.workflows = workflows
    })
  }

  beforeDestroy () {
    if (workflowService.observable !== null) {
      workflowService.observable.unsubscribe()
    }
  }
}
