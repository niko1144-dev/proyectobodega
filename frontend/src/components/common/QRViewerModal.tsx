import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Asset } from '../../types/asset';
import { Modal } from './Modal';
import { PropertyBadge, StatusBadge } from './Badge';
import { Printer, Copy, Check } from 'lucide-react';
import { PDFService } from '../../services/pdfService';

interface QRViewerModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QRViewerModal: React.FC<QRViewerModalProps> = ({ asset, isOpen, onClose }) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (asset) {
      const payload = JSON.stringify({
        id: asset.id,
        serie: asset.serialNumber,
        inv: asset.inventoryNumber || 'N/A',
        propiedad: asset.propertyType,
        tipo: asset.assetTypeName,
        marca: asset.brand,
        modelo: asset.model,
        sucursal: asset.currentBranchName,
        sistema: 'ITAM_CHILEATIENDE'
      }, null, 2);

      QRCode.toDataURL(payload, {
        margin: 1,
        width: 260,
        color: {
          dark: '#003B70',
          light: '#FFFFFF'
        }
      }).then(setQrUrl);
    }
  }, [asset]);

  if (!asset) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(asset.serialNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintSticker = () => {
    PDFService.generateAssetStickersPDF([asset]);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Etiqueta y Código QR de Activo"
      subtitle={`${asset.brand} ${asset.model} • S/N: ${asset.serialNumber}`}
      maxWidth="md"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Contenedor QR */}
        <div className="p-4 bg-white dark:bg-[#0D182B] rounded-xl shadow-gov dark:shadow-black/40 border border-slate-200 dark:border-[#1E3352]">
          {qrUrl ? (
            <div className="bg-white p-2 rounded-lg">
              <img src={qrUrl} alt="QR Activo" className="w-48 h-48 object-contain mx-auto" />
            </div>
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-slate-400">Generando QR...</div>
          )}
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[#1E3352]/60 flex justify-between items-center text-[11px] font-mono text-slate-700 dark:text-slate-300">
            <span className="font-bold text-[#003B70] dark:text-[#38BDF8]">S/N: {asset.serialNumber}</span>
            <span>{asset.propertyType}</span>
          </div>
        </div>

        {/* Ficha Rápida */}
        <div className="w-full bg-slate-50 dark:bg-[#0D182B] rounded-lg p-3.5 border border-slate-200 dark:border-[#1E3352] text-left space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Modalidad:</span>
            <PropertyBadge type={asset.propertyType} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Estado:</span>
            <StatusBadge status={asset.status} />
          </div>
          {asset.inventoryNumber && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">N° Inventario:</span>
              <span className="font-mono font-bold text-[#003B70] dark:text-[#38BDF8]">{asset.inventoryNumber}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Sucursal:</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">{asset.currentBranchName}</span>
          </div>
          {asset.assignedToUserName && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Asignado a:</span>
              <span className="text-[#003B70] dark:text-[#38BDF8] font-bold">{asset.assignedToUserName}</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 w-full pt-1">
          <button
            onClick={handleCopy}
            className="flex-1 gov-btn-secondary"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? '¡Copiado!' : 'Copiar Serie'}
          </button>
          
          <button
            onClick={handlePrintSticker}
            className="flex-1 gov-btn-primary"
          >
            <Printer className="w-4 h-4" />
            Descargar Etiqueta PDF
          </button>
        </div>
      </div>
    </Modal>
  );
};
