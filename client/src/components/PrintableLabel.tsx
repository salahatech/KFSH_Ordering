import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Printer, Download } from 'lucide-react';

interface LabelData {
  id: string;
  type: 'batch' | 'shipment' | 'material';
  primaryText: string;
  secondaryText?: string;
  details?: { label: string; value: string }[];
  qrData?: string;
  barcodeData?: string;
}

interface PrintableLabelProps {
  data: LabelData;
  size?: 'small' | 'medium' | 'large';
  showPrintButton?: boolean;
}

export default function PrintableLabel({
  data,
  size = 'medium',
  showPrintButton = true,
}: PrintableLabelProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const qrCodeRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const sizes = {
    small: { width: 200, height: 100, fontSize: 10, qrSize: 50 },
    medium: { width: 300, height: 150, fontSize: 12, qrSize: 80 },
    large: { width: 400, height: 200, fontSize: 14, qrSize: 100 },
  };

  const config = sizes[size];

  useEffect(() => {
    if (barcodeRef.current && data.barcodeData) {
      try {
        JsBarcode(barcodeRef.current, data.barcodeData, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: config.fontSize,
          margin: 5,
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }, [data.barcodeData, config.fontSize]);

  useEffect(() => {
    if (qrCodeRef.current && data.qrData) {
      QRCode.toCanvas(qrCodeRef.current, data.qrData, {
        width: config.qrSize,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).catch((e) => console.error('QR code generation error:', e));
    }
  }, [data.qrData, config.qrSize]);

  const handlePrint = async () => {
    if (!labelRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let qrDataUrl = '';
    if (qrCodeRef.current) {
      qrDataUrl = qrCodeRef.current.toDataURL('image/png');
    }

    let labelHtml = labelRef.current.innerHTML;
    if (qrDataUrl && qrCodeRef.current) {
      labelHtml = labelHtml.replace(
        /<canvas[^>]*><\/canvas>/i,
        `<img src="${qrDataUrl}" width="${config.qrSize}" height="${config.qrSize}" />`
      );
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label - ${data.primaryText}</title>
          <style>
            @page {
              size: ${config.width}px ${config.height}px;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 10px;
              font-family: 'Arial', sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .label-container {
              width: ${config.width - 20}px;
              height: ${config.height - 20}px;
              border: 1px solid #000;
              padding: 10px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
            }
            .label-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 8px;
            }
            .label-title {
              font-size: ${config.fontSize + 4}px;
              font-weight: bold;
              margin: 0;
            }
            .label-subtitle {
              font-size: ${config.fontSize}px;
              color: #666;
              margin: 2px 0 0 0;
            }
            .label-type {
              font-size: ${config.fontSize - 2}px;
              background: #000;
              color: #fff;
              padding: 2px 6px;
              border-radius: 4px;
              text-transform: uppercase;
            }
            .label-details {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-bottom: 8px;
              font-size: ${config.fontSize}px;
            }
            .detail-item {
              display: flex;
              gap: 4px;
            }
            .detail-label {
              font-weight: 600;
            }
            .codes-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: auto;
            }
            canvas, svg {
              max-width: 100%;
            }
            @media print {
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${labelHtml}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = async () => {
    if (!labelRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(labelRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `label-${data.type}-${data.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  return (
    <div>
      <div
        ref={labelRef}
        className="label-container"
        style={{
          width: `${config.width}px`,
          minHeight: `${config.height}px`,
          border: '2px solid #000',
          borderRadius: '8px',
          padding: '12px',
          background: '#fff',
          color: '#000',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '8px',
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: `${config.fontSize + 4}px`,
              fontWeight: 'bold',
            }}>
              {data.primaryText}
            </h3>
            {data.secondaryText && (
              <p style={{
                margin: '2px 0 0',
                fontSize: `${config.fontSize}px`,
                color: '#666',
              }}>
                {data.secondaryText}
              </p>
            )}
          </div>
          <span style={{
            fontSize: `${config.fontSize - 2}px`,
            background: '#000',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            {data.type}
          </span>
        </div>

        {data.details && data.details.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '10px',
            fontSize: `${config.fontSize}px`,
          }}>
            {data.details.map((detail, index) => (
              <div key={index} style={{ display: 'flex', gap: '4px' }}>
                <span style={{ fontWeight: 600 }}>{detail.label}:</span>
                <span>{detail.value}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'auto',
        }}>
          {data.barcodeData && (
            <svg ref={barcodeRef} style={{ maxWidth: '60%' }} />
          )}
          {data.qrData && (
            <canvas ref={qrCodeRef} style={{ marginLeft: 'auto' }} />
          )}
        </div>
      </div>

      {showPrintButton && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '12px',
        }}>
          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--primary)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <Printer size={16} />
            Print Label
          </button>
          <button
            onClick={handleDownload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <Download size={16} />
            Download
          </button>
        </div>
      )}
    </div>
  );
}

export function BatchLabel({ batch }: { batch: any }) {
  const labelData: LabelData = {
    id: batch.id,
    type: 'batch',
    primaryText: batch.batchNumber || `BATCH-${batch.id.slice(0, 8)}`,
    secondaryText: batch.product?.name,
    details: [
      { label: 'Product', value: batch.product?.code || 'N/A' },
      { label: 'Qty', value: `${batch.plannedQuantity || 0} ${batch.product?.unitOfMeasure || 'units'}` },
      ...(batch.expiryDate ? [{ label: 'Exp', value: new Date(batch.expiryDate).toLocaleDateString() }] : []),
    ],
    barcodeData: batch.batchNumber || batch.id,
    qrData: JSON.stringify({
      type: 'batch',
      id: batch.id,
      batchNumber: batch.batchNumber,
      product: batch.product?.code,
    }),
  };

  return <PrintableLabel data={labelData} size="medium" />;
}

export function ShipmentLabel({ shipment }: { shipment: any }) {
  const labelData: LabelData = {
    id: shipment.id,
    type: 'shipment',
    primaryText: shipment.shipmentNumber || `SHIP-${shipment.id.slice(0, 8)}`,
    secondaryText: shipment.customer?.name,
    details: [
      { label: 'To', value: shipment.deliveryAddress?.city || 'N/A' },
      ...(shipment.scheduledDate ? [{ label: 'Date', value: new Date(shipment.scheduledDate).toLocaleDateString() }] : []),
      ...(shipment.priority ? [{ label: 'Priority', value: shipment.priority }] : []),
    ],
    barcodeData: shipment.shipmentNumber || shipment.id,
    qrData: JSON.stringify({
      type: 'shipment',
      id: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      customer: shipment.customer?.name,
    }),
  };

  return <PrintableLabel data={labelData} size="medium" />;
}

export function MaterialLabel({ material }: { material: any }) {
  const labelData: LabelData = {
    id: material.id,
    type: 'material',
    primaryText: material.name,
    secondaryText: material.code,
    details: [
      { label: 'Cat', value: material.category?.replace(/_/g, ' ') || 'N/A' },
      { label: 'Unit', value: material.unitOfMeasure || 'N/A' },
      ...(material.lotNumber ? [{ label: 'Lot', value: material.lotNumber }] : []),
    ],
    barcodeData: material.barcode || material.code || material.id,
    qrData: JSON.stringify({
      type: 'material',
      id: material.id,
      code: material.code,
      name: material.name,
    }),
  };

  return <PrintableLabel data={labelData} size="small" />;
}
