import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    // Reload the page to clear any corrupted states
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white/30 p-4">
          <div className="max-w-md w-full bg-white rounded-xl p-8 shadow-premium border border-white/40 text-center space-y-6">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">Terjadi Kesalahan Sistem</h2>
              <p className="text-sm text-text-secondary font-medium leading-relaxed">
                Aplikasi gagal memuat halaman ini. Hal ini biasanya disebabkan oleh koneksi yang terputus atau sesi yang berakhir.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={this.handleRetry}
                className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-glass shadow-glass hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 uppercase tracking-widest text-xs"
              >
                Muat Ulang Halaman
              </button>
            </div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Error: {this.state.error?.name || 'Unknown Error'}</p>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
