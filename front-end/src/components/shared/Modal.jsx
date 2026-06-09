import { useEffect, useRef } from 'react';

/**
 * Modal reutilizável. Usa os estilos .modal-overlay / .modal / .modal-close
 * / .modal-header já definidos em global.css.
 *
 * Props:
 *   title    — texto do cabeçalho
 *   onClose  — chamado ao fechar (ESC, clique no backdrop ou no ✕)
 *   children — conteúdo do modal
 *   wide     — bool: aumenta max-width para 720px (default: 560px)
 */
export default function Modal({ title, onClose, children, wide = false }) {
  const closeRef = useRef(null);

  // Foco no botão de fechar ao montar; restore ao desmontar é automático.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Fechar com ESC
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Impede scroll do body enquanto aberto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={handleBackdrop}
    >
      <div
        className="modal"
        style={wide ? { maxWidth: '720px' } : undefined}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <span>{title}</span>
          <button
            ref={closeRef}
            className="modal-close"
            aria-label="Fechar"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
