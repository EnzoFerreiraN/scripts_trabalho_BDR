import { Component } from 'react';
import ErrorBox from './ErrorBox';

/**
 * Isola falhas de renderização: se um tab quebrar, os demais continuam
 * funcionando em vez de derrubar a página inteira.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorBox message="Algo deu errado ao exibir esta seção. Recarregue a página para tentar novamente." />;
    }
    return this.props.children;
  }
}
