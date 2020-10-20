import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { StackedPanel, Widget } from '@lumino/widgets';

import Vue from 'vue';
import GScan from './gscan/gscan';

/**
 * Initialization data for the cylc-gscan extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'cylc-gscan',
  autoStart: true,
  activate: (app: JupyterFrontEnd, layout: ILayoutRestorer) => {
    console.log('JupyterLab extension cylc-gscan is activated!');
    buildUI(app, layout);
  },
  requires: [ILayoutRestorer]
};

function buildUI(app: JupyterFrontEnd, layout: ILayoutRestorer) {
  const view = new Widget();
  const sidePanel = new StackedPanel();
  sidePanel.id = 'cylc-gscan';
  sidePanel.addWidget(view);

  // add side panel view to JupyterLab
  layout.add(sidePanel, 'v-VerdantPanel');
  app.shell.add(sidePanel, 'left');

  renderGScan(view);
  return view;
}

function renderGScan(widget: Widget) {
  // TODO: render the GScan component here
  // now render the panel view
  new Vue({
    el: widget.node.id,
    render(h) {
      return h(GScan, {});
    }
  });
  // const component = VueInReact(GScan);
  // const ui = React.createElement(component, props);
  // ReactDOM.render(ui, widget.node);
}

export default extension;
