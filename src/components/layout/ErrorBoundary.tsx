'use client';

import React from 'react';
import { handleError } from '@/lib/error-handler';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    handleError(error, `ErrorBoundary:${errorInfo.componentStack?.split('\n')[1]?.trim() || 'unknown'}`);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-4xl">⚠</div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              문제가 발생했습니다
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              예기치 않은 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-[var(--bg)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-[1px] active:translate-y-0 transition-all"
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
