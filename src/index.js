import { StackedPanel, Widget } from '@lumino/widgets';
import Vue from 'vue';
import GScan from './gscan/GScan.vue';
/**
 * Initialization data for the cylc-gscan extension.
 */
var extension = {
    id: 'cylc-gscan',
    autoStart: true,
    activate: function (app, layout) {
        console.log('JupyterLab extension cylc-gscan is activated!');
        buildUI(app, layout);
    }
};
function buildUI(app, layout) {
    var view = new Widget();
    var sidePanel = new StackedPanel();
    sidePanel.id = 'cylc-gscan';
    sidePanel.addWidget(view);
    // add side panel view to JupyterLab
    layout.add(sidePanel, 'v-VerdantPanel');
    app.shell.add(sidePanel, 'left');
    renderGScan(view);
    return view;
}
function renderGScan(widget, props) {
    if (props === void 0) { props = {}; }
    // TODO: render the GScan component here
    // now render the panel view
    new Vue({
        el: widget.node.id,
        render: function (h) {
            return h(GScan, {});
        }
    });
    // const component = VueInReact(GScan);
    // const ui = React.createElement(component, props);
    // ReactDOM.render(ui, widget.node);
}
export default extension;
