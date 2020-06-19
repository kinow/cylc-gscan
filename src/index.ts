import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the cylc-gscan extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'cylc-gscan',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension cylc-gscan is activated!');
  }
};

export default extension;
