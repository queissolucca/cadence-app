'use client';

import { Provider } from '../../lib/comecar/state';
import { App } from '../../components/comecar/App';

export default function ComecarPage() {
  return (
    <Provider>
      <App />
    </Provider>
  );
}
