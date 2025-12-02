import React from 'react';
import { MinerDashboard } from './components/MinerDashboard';
import { ReactNode } from 'react';

class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('React Error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Application Error</h2>
            <p className="text-red-700 mb-4">{this.state.error?.message}</p>
            <details className="text-sm text-red-600 bg-red-100 p-3 rounded">
              <summary className="cursor-pointer font-medium">Stack Trace</summary>
              <pre className="mt-2 overflow-auto text-xs">{this.state.error?.stack}</pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <MinerDashboard />
    </ErrorBoundary>
  );
}

export default App;
