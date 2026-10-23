import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { BsPrinter, BsFilePdf, BsCopy, BsCheckCircle } from 'react-icons/bs';
import { useQRCodeModal } from '../../hooks/useQRCodeModal';
import type { QRCodeModalProps } from './types';

export type { QRCodeModalMode } from './types';

export default function QRCodeModal(props: QRCodeModalProps) {
  const { t, url, label, printLabel, emoji, qr, copied, handleCopy, handlePrint, handlePdf } =
    useQRCodeModal(props);

  return (
    <Modal show={props.show} onClose={props.onClose} size="xl" dismissible>
      <ModalHeader>{t('header.qrTitle')}</ModalHeader>
      <ModalBody>
        <div className="flex flex-col items-center text-center">
          <div className="text-2xl mb-4 font-semibold dark:text-white">
            {emoji} {label}
          </div>
          <div className="bg-white p-3 rounded-xl shadow-lg">
            {qr ? (
              <img src={qr} alt={label} className="size-64 md:size-72" />
            ) : (
              <div className="size-64 md:size-72 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <code className="text-sm bg-gray-100 dark:text-white dark:bg-gray-800 px-3 py-1 rounded break-all max-w-xs">
              {url}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
              title={t('header.copyUrl')}
            >
              {copied ? <BsCheckCircle className="size-5 text-green-500" /> : <BsCopy className="size-5" />}
            </button>
          </div>
        </div>

        <div className="hidden print:block fixed inset-0 z-9999 bg-white p-8">
          <div className="flex flex-col items-center justify-start h-full">
            <div className="flex flex-col items-center w-full">
              {qr && <img src={qr} alt={printLabel} className="w-full max-w-[180mm] h-auto" />}
              <p className="mt-8 text-5xl font-bold">
                {printLabel}
              </p>
              <p className="text-base text-gray-600 mt-4 break-all max-w-lg">{url}</p>
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={handlePrint}>
          <BsPrinter className="mr-2 size-5" />
          {t('header.printQrCode')}
        </Button>
        <Button color="purple" onClick={handlePdf} disabled={!qr}>
          <BsFilePdf className="mr-2 size-5" />
          {t('header.downloadQrPdf')}
        </Button>
        <Button color="gray" onClick={props.onClose}>
          {t('common.close')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
