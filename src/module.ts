import { PanelPlugin } from '@grafana/data';
import { SimpleOptions } from './types';
import { SimplePanel } from './components/SimplePanel';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'GrafanaApiKey',
      name: 'Grafana api key',
      description: 'Your Grafana api key (Role:Viewer)',
      defaultValue: '',
    })

});
