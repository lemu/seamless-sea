import { Button } from "@rafal.lemieszewski/tide-ui";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyStateIllustration = () => (
  <svg
    width="116"
    height="91"
    viewBox="0 0 116 91"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
  >
    <title>Empty Board</title>
    <defs>
      <rect id="path-1" x="0" y="13" width="91" height="64" rx="4"></rect>
      <filter
        x="-2.7%"
        y="-2.3%"
        width="105.5%"
        height="107.8%"
        filterUnits="objectBoundingBox"
        id="filter-2"
      >
        <feMorphology
          radius="0.5"
          operator="dilate"
          in="SourceAlpha"
          result="shadowSpreadOuter1"
        ></feMorphology>
        <feOffset
          dx="0"
          dy="1"
          in="shadowSpreadOuter1"
          result="shadowOffsetOuter1"
        ></feOffset>
        <feGaussianBlur
          stdDeviation="0.5"
          in="shadowOffsetOuter1"
          result="shadowBlurOuter1"
        ></feGaussianBlur>
        <feComposite
          in="shadowBlurOuter1"
          in2="SourceAlpha"
          operator="out"
          result="shadowBlurOuter1"
        ></feComposite>
        <feColorMatrix
          values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.1 0"
          type="matrix"
          in="shadowBlurOuter1"
        ></feColorMatrix>
      </filter>
      <rect id="path-3" x="0" y="0" width="41" height="26" rx="2"></rect>
      <filter
        x="-9.8%"
        y="-11.5%"
        width="119.5%"
        height="130.8%"
        filterUnits="objectBoundingBox"
        id="filter-4"
      >
        <feMorphology
          radius="0.5"
          operator="dilate"
          in="SourceAlpha"
          result="shadowSpreadOuter1"
        ></feMorphology>
        <feOffset
          dx="0"
          dy="1"
          in="shadowSpreadOuter1"
          result="shadowOffsetOuter1"
        ></feOffset>
        <feGaussianBlur
          stdDeviation="1"
          in="shadowOffsetOuter1"
          result="shadowBlurOuter1"
        ></feGaussianBlur>
        <feComposite
          in="shadowBlurOuter1"
          in2="SourceAlpha"
          operator="out"
          result="shadowBlurOuter1"
        ></feComposite>
        <feColorMatrix
          values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.1 0"
          type="matrix"
          in="shadowBlurOuter1"
        ></feColorMatrix>
      </filter>
      <rect id="path-5" x="0" y="0" width="40" height="26" rx="2"></rect>
      <filter
        x="-10.0%"
        y="-11.5%"
        width="120.0%"
        height="130.8%"
        filterUnits="objectBoundingBox"
        id="filter-6"
      >
        <feMorphology
          radius="0.5"
          operator="dilate"
          in="SourceAlpha"
          result="shadowSpreadOuter1"
        ></feMorphology>
        <feOffset
          dx="0"
          dy="1"
          in="shadowSpreadOuter1"
          result="shadowOffsetOuter1"
        ></feOffset>
        <feGaussianBlur
          stdDeviation="1"
          in="shadowOffsetOuter1"
          result="shadowBlurOuter1"
        ></feGaussianBlur>
        <feComposite
          in="shadowBlurOuter1"
          in2="SourceAlpha"
          operator="out"
          result="shadowBlurOuter1"
        ></feComposite>
        <feColorMatrix
          values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.1 0"
          type="matrix"
          in="shadowBlurOuter1"
        ></feColorMatrix>
      </filter>
    </defs>
    <g id="Page-1" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <g id="Group" transform="translate(2, 2)">
        <g id="Rectangle">
          <use
            fill="black"
            fillOpacity="1"
            filter="url(#filter-2)"
            xlinkHref="#path-1"
          ></use>
          <use
            stroke="#D4D7DA"
            strokeWidth="1"
            fill="#FFFFFF"
            fillRule="evenodd"
            xlinkHref="#path-1"
          ></use>
        </g>
        <path
          d="M5.5,47.5 L41.5,47.5 C42.0522847,47.5 42.5,47.9477153 42.5,48.5 L42.5,71.5 C42.5,72.0522847 42.0522847,72.5 41.5,72.5 L5.5,72.5 C4.94771525,72.5 4.5,72.0522847 4.5,71.5 L4.5,48.5 C4.5,47.9477153 4.94771525,47.5 5.5,47.5 Z"
          id="Rectangle"
          stroke="#C0C3C9"
          strokeDasharray="2"
        ></path>
        <rect
          id="Rectangle"
          stroke="#D4D7DA"
          fill="#FFFFFF"
          x="4.5"
          y="17.5"
          width="38"
          height="25"
          rx="1"
        ></rect>
        <g transform="translate(47.5, 17.5)">
          <path
            d="M1,0 L38,0 C38.5522847,0 39,0.44771525 39,1 L39,24 C39,24.5522847 38.5522847,25 38,25 L1,25 C0.44771525,25 0,24.5522847 0,24 L0,1 C0,0.44771525 0.44771525,1.11022302e-16 1,0 Z"
            id="Rectangle"
            stroke="#99BFCE"
            fill="#E5EFF3"
            fillRule="nonzero"
            strokeDasharray="2"
          ></path>
          <path
            d="M15.5,12.5 C15.5,12.2239 15.7239,12 16,12 L23,12 C23.2761,12 23.5,12.2239 23.5,12.5 C23.5,12.7761 23.2761,13 23,13 L16,13 C15.7239,13 15.5,12.7761 15.5,12.5 Z"
            id="Path"
            fill="#99BFCE"
          ></path>
          <path
            d="M19.5,8.5 C19.7761,8.5 20,8.7239 20,9 L20,16 C20,16.2761 19.7761,16.5 19.5,16.5 C19.2239,16.5 19,16.2761 19,16 L19,9 C19,8.7239 19.2239,8.5 19.5,8.5 Z"
            id="Path"
            fill="#99BFCE"
          ></path>
        </g>
        <g transform="translate(47.5, 47.5)">
          <path
            d="M1,0 L38,0 C38.5522847,0 39,0.44771525 39,1 L39,24 C39,24.5522847 38.5522847,25 38,25 L1,25 C0.44771525,25 0,24.5522847 0,24 L0,1 C0,0.44771525 0.44771525,1.11022302e-16 1,0 Z"
            id="Rectangle"
            stroke="#99BFCE"
            fill="#E5EFF3"
            fillRule="nonzero"
            strokeDasharray="2"
          ></path>
          <path
            d="M15.5,12.5 C15.5,12.2239 15.7239,12 16,12 L23,12 C23.2761,12 23.5,12.2239 23.5,12.5 C23.5,12.7761 23.2761,13 23,13 L16,13 C15.7239,13 15.5,12.7761 15.5,12.5 Z"
            id="Path"
            fill="#99BFCE"
          ></path>
          <path
            d="M19.5,8.5 C19.7761,8.5 20,8.7239 20,9 L20,16 C20,16.2761 19.7761,16.5 19.5,16.5 C19.2239,16.5 19,16.2761 19,16 L19,9 C19,8.7239 19.2239,8.5 19.5,8.5 Z"
            id="Path"
            fill="#99BFCE"
          ></path>
        </g>
        <g transform="translate(70, 0)" fillRule="nonzero">
          <g id="Rectangle-Copy">
            <use
              fill="black"
              fillOpacity="1"
              filter="url(#filter-4)"
              xlinkHref="#path-3"
            ></use>
            <use
              stroke="#D4D7DA"
              strokeWidth="1"
              fill="#FFFFFF"
              xlinkHref="#path-3"
            ></use>
          </g>
          <rect
            id="Rectangle"
            fill="#A1BECC"
            x="11"
            y="9"
            width="5"
            height="13"
          ></rect>
          <polygon
            id="Rectangle-Copy-2"
            fill="#A1BECC"
            points="4 16 9 16 9 22 4 22"
          ></polygon>
          <rect
            id="Rectangle"
            fill="#A1BECC"
            x="25"
            y="14"
            width="5"
            height="8"
          ></rect>
          <rect
            id="Rectangle"
            fill="#A1BECC"
            x="32"
            y="9"
            width="5"
            height="13"
          ></rect>
          <rect
            id="Rectangle"
            fill="#A1BECC"
            x="18"
            y="5"
            width="5"
            height="17"
          ></rect>
        </g>
        <g transform="translate(59, 59)">
          <g id="Rectangle" fillRule="nonzero">
            <use
              fill="black"
              fillOpacity="1"
              filter="url(#filter-6)"
              xlinkHref="#path-5"
            ></use>
            <use
              stroke="#D4D7DA"
              strokeWidth="1"
              fill="#FFFFFF"
              xlinkHref="#path-5"
            ></use>
          </g>
          <polyline
            id="Path"
            stroke="#99BFCE"
            strokeWidth="2"
            points="3.5 16.5 11 11.3788 17.5 13.7424 24 7.8333 31 10.5909 35.5 3.5"
          ></polyline>
          <polyline
            id="Path"
            stroke="#C1C3C8"
            strokeWidth="2"
            points="3.5 18.4994 11.0002 17.0092 17.5002 17.009 24.0002 19.509 31.0002 18.4994 35.5 14"
          ></polyline>
        </g>
      </g>
    </g>
  </svg>
);

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: "calc(100vh - 200px)" }}
    >
      <div className="w-[420px] text-left">
        <div className="mb-6">
          <EmptyStateIllustration />
        </div>
        <h3 className="text-heading-lg mb-3 text-[var(--color-text-primary)]">
          {title}
        </h3>
        <p className="text-body-md mb-6 leading-relaxed text-[var(--color-text-secondary)]">
          {description}
        </p>
        {actionLabel && onAction && (
          <Button
            variant="primary"
            icon="plus"
            iconPosition="left"
            onClick={onAction}
            className="w-full"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
