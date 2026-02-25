import React, { type MutableRefObject } from "react";
import { Modal } from "antd";
import type { MaterialPreviewState } from "./courseFormWizardTypes";

interface MaterialPreviewModalProps {
  preview: MaterialPreviewState;
  onClose: () => void;
  previewBlobUrlRef: MutableRefObject<string | null>;
}

const MaterialPreviewModal = ({
  preview,
  onClose,
  previewBlobUrlRef,
}: MaterialPreviewModalProps) => (
  <Modal
    title={preview.title}
    open={preview.visible}
    onCancel={() => {
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
      }
      onClose();
    }}
    footer={null}
    width={1000}
    style={{ maxWidth: "95vw", top: 20 }}
    centered
    bodyStyle={{ padding: 0, height: "70vh" }}
    destroyOnClose
  >
    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-b-lg">
      {preview.type === "video" && (
        <video
          controls
          autoPlay
          className="max-w-full max-h-full"
          src={preview.url}
        >
          {preview.subtitleUrl && (
            <track kind="subtitles" src={preview.subtitleUrl} default />
          )}
        </video>
      )}
      {preview.type === "pdf" && (
        <iframe
          src={`${preview.url}#toolbar=0`}
          className="w-full h-full border-none"
          title="PDF Preview"
        />
      )}
      {preview.type === "youtube" && (
        <iframe
          src={preview.url}
          className="w-full h-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube Preview"
        />
      )}
      {preview.type === "iframe" && (
        <iframe
          src={preview.url}
          className="w-full h-full border-none bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="External Preview"
        />
      )}
    </div>
  </Modal>
);

export default MaterialPreviewModal;
