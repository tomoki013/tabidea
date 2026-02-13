"use client";

import { Component, type ReactNode } from "react";

interface MapErrorBoundaryProps {
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
}

interface MapErrorBoundaryState {
  hasError: boolean;
}

export default class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  constructor(props: MapErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[MapErrorBoundary] Google Maps failed to load:", error.message);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={`bg-stone-100 rounded-xl flex items-center justify-center text-stone-500 ${this.props.className || ""}`}
          style={{ minHeight: "200px" }}
        >
          <div className="text-center p-4">
            <p className="text-sm font-medium">地図の読み込みに失敗しました</p>
            <p className="text-xs mt-1 text-stone-400">
              Google Maps APIの設定を確認してください
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
