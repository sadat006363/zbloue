// components/ErrorBoundary.tsx

'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // لاگ کردن خطا
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);

    // فراخوانی onError اگر وجود داشته باشد
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // اگر fallback داده شده باشد، از آن استفاده کن
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // fallback پیش‌فرض
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 max-w-md text-center">
            <div className="text-5xl mb-4">💥</div>
            <h2 className="text-xl font-semibold text-red-700 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-red-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition text-sm"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}