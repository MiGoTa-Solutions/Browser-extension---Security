import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string | ReactNode;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
}

export function AlertDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel'
}: AlertDialogProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-yellow-500" />;
      case 'confirm':
        return <AlertCircle className="w-12 h-12 text-blue-500" />;
      default:
        return <AlertCircle className="w-12 h-12 text-blue-500" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100';
      case 'error':
        return 'bg-red-100';
      case 'warning':
        return 'bg-yellow-100';
      case 'confirm':
        return 'bg-blue-100';
      default:
        return 'bg-blue-100';
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-6">
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        
        <div className="relative bg-white rounded-2xl shadow-2xl transform transition-all w-full max-w-md animate-in fade-in zoom-in duration-200">
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className={`${getIconBg()} rounded-full p-3 mb-4`}>
                {getIcon()}
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {title}
              </h3>
              
              <div className="text-gray-600 mb-6">
                {message}
              </div>
              
              <div className="flex gap-3 w-full">
                {type === 'confirm' ? (
                  <>
                    <Button
                      variant="secondary"
                      onClick={onClose}
                      className="flex-1"
                    >
                      {cancelText}
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      className="flex-1"
                    >
                      {confirmText}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleConfirm}
                    className="w-full"
                  >
                    {confirmText}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
