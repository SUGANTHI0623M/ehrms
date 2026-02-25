import React from "react";
import { Modal, Progress, Typography } from "antd";
import type { MaterialSaveUploadProgressState } from "./courseFormWizardTypes";
import { PRIMARY_COLOR } from "./courseFormWizardConstants";

const { Text } = Typography;

interface UploadProgressModalProps {
  progress: MaterialSaveUploadProgressState;
}

const UploadProgressModal = ({ progress }: UploadProgressModalProps) => {
  const overallPercent =
    progress.totalFiles > 0
      ? Math.round(
          Object.values(progress.perFile).reduce((a, b) => a + b, 0) /
            progress.totalFiles
        )
      : 0;

  return (
    <Modal
      title="Uploading materials"
      open={progress.visible}
      footer={null}
      closable={false}
      maskClosable={false}
      width={420}
      style={{ maxWidth: "95vw" }}
      centered
    >
      <div className="py-2">
        <div className="mb-4">
          <Text type="secondary" className="block mb-2">
            Uploading {progress.totalFiles} material(s) to cloud storage...
          </Text>
          <Progress
            percent={overallPercent}
            status="active"
            strokeColor={PRIMARY_COLOR}
          />
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {Object.entries(progress.fileNames).map(([matIndexStr, fileName]) => {
            const matIndex = Number(matIndexStr);
            const percent = progress.perFile[matIndex] ?? 0;
            return (
              <div key={matIndex} className="flex items-center gap-3">
                <Text ellipsis className="flex-1 text-sm" title={fileName}>
                  {fileName}
                </Text>
                <Progress
                  percent={percent}
                  size="small"
                  status="active"
                  style={{ marginBottom: 0, width: 100 }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export default UploadProgressModal;
