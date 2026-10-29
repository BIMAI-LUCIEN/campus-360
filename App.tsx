// App.tsx — Entry point: remote config gate (maintenance, forced update, banner) around AppShell
import React from 'react';
import { AppShell } from './src/AppShell';
import { RemoteConfigGate } from './src/features/config/RemoteConfigGate';

export default function App() {
  return (
    <RemoteConfigGate>
      <AppShell />
    </RemoteConfigGate>
  );
}
