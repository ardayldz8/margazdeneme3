import React from 'react';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-slate-200 p-6 space-y-4">
            <div className="text-sm uppercase tracking-wide text-slate-500">Beklenmedik hata</div>
            <h1 className="text-2xl font-semibold">Bir sorun oluştu</h1>
            <p className="text-slate-600">
              Sayfa beklenmedik bir hata nedeniyle kapandı. Lütfen sayfayı yenileyip tekrar
              deneyin. Sorun devam ederse destek ile iletişime geçin.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800"
            >
              Sayfayı yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
