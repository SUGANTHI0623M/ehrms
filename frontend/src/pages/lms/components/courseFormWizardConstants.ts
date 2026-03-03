import {
  VideoCameraOutlined,
  YoutubeOutlined,
  FilePdfOutlined,
  GlobalOutlined,
} from "@ant-design/icons";

export const PRIMARY_COLOR = "#efaa1f"; // Primary color

export const CONTENT_TYPE_MAP: Record<string, string> = {
  Video: "VIDEO",
  YouTube: "YOUTUBE",
  PDF: "PDF",
  "External URL": "URL",
};

export const MATERIAL_TYPE_OPTIONS = [
  { value: "Video", label: "MP4 Video", icon: VideoCameraOutlined },
  { value: "YouTube", label: "YouTube Video", icon: YoutubeOutlined },
  { value: "PDF", label: "PDF Document", icon: FilePdfOutlined },
  {
    value: "External URL",
    label: "Embedded Website/URL",
    icon: GlobalOutlined,
  },
] as const;

export const VIDEO_SIZE_LIMIT_GB = 1;
export const PDF_SIZE_LIMIT_MB = 50;
