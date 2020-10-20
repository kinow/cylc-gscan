import Vue from 'vue';
import Component from 'vue-class-component';

@Component({
  props: {
    status: {
      type: String,
      required: true
    }
  },
  template: `<template functional>
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
        v-bind:class="[props.status]"
        x="10" y="10"
        width="80" height="80"
        rx="20" ry="20"
        stroke-width="10"
      />
    </svg>
  </span>
  </span>
</template>`
})
export default class Job extends Vue {

}
