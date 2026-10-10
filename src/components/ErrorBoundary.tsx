import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Mail } from 'lucide-react';
import { openSupportEmail } from '../utils/supportEmail';
import { I18nService } from '../services/i18nService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CofreAdmin ErrorBoundary] Erro capturado:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        });
      }
    } catch (e) {
      console.warn('Erro ao limpar armazenamento:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const currentLang = I18nService.getLanguage();
      const isEn = currentLang === 'en-US';

      return (
        <div className="min-h-screen bg-[#F4F6FB] flex flex-col items-center justify-center p-6 text-center select-none" id="error-boundary-screen">
          <div className="w-full max-w-sm bg-white border-3 border-black rounded-[24px] p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FFE4E6] border-2 border-black flex items-center justify-center text-rose-600 shadow-neo-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="font-['Outfit'] font-black text-xl text-black">
                {isEn ? 'Oops! Something unexpected happened' : 'Ops! Algo inesperado aconteceu'}
              </h2>
              <p className="text-xs text-neutral-600 font-medium mt-1.5 leading-relaxed">
                {isEn
                  ? 'The app encountered a temporary error while loading data.'
                  : 'O aplicativo encontrou um erro temporário durante o carregamento dos dados.'}
              </p>
            </div>

            {this.state.error?.message && (
              <div className="w-full p-2.5 bg-neutral-100 border border-neutral-300 rounded-xl text-left text-[11px] font-mono text-neutral-700 overflow-x-auto max-h-24 no-scrollbar">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-2 w-full pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl border-2 border-black bg-[#B8F256] hover:bg-[#A3E635] text-black font-['Outfit'] font-black text-sm shadow-neo-sm btn-press flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{isEn ? 'Reload Application' : 'Recarregar Aplicativo'}</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-xl border border-black/30 bg-white hover:bg-neutral-100 text-neutral-700 font-['Outfit'] font-bold text-xs btn-press flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 opacity-60" />
                <span>{isEn ? 'Clear Cache and Restart' : 'Limpar Cache e Reiniciar'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openSupportEmail({
                    errorMessage:
                      this.state.error?.message ||
                      (isEn ? 'Unexpected error caught by ErrorBoundary' : 'Erro inesperado capturado pelo ErrorBoundary'),
                    actionContext: isEn ? 'Critical Crash / ErrorBoundary' : 'Falha crítica / ErrorBoundary',
                    language: currentLang,
                  });
                }}
                className="w-full py-2 px-3 rounded-lg border border-black/20 bg-neutral-50 hover:bg-rose-50 text-neutral-600 hover:text-rose-700 font-['Outfit'] font-semibold text-xs btn-press flex items-center justify-center gap-1.5 cursor-pointer transition-colors mt-1"
              >
                <Mail className="w-3.5 h-3.5 text-rose-500" />
                <span>{isEn ? 'Report Issue via Email' : 'Relatar Problema por E-mail'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
