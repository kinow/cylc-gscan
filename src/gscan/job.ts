import Vue from 'vue';
import Component from 'vue-class-component';

const compiler = require('vue-template-compiler');

const TEMPLATE = `
<span class="job_theme--normal">
    <span
      class="c-job"
      style="display:inline-block; vertical-align:middle"
    >
    <svg
      class="job"
      viewBox="0 0 100 100"
    >
      <rect
        v-bind:class="[status]"
        x="10" y="10"
        width="80" height="80"
        rx="20" ry="20"
        stroke-width="10"
      />
    </svg>
  </span>
</span>
`

@Component({
  props: {
    status: {
      type: String,
      required: true
    }
  },
  render(createElement: any, context: any): any {
    const { render } = compiler.compileToFunctions(TEMPLATE);
    return render(createElement, {})
  }
})
export default class Job extends Vue {

}
