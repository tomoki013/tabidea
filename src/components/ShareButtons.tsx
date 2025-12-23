import { useState, useEffect } from "react";
import { Itinerary, UserInput } from "@/lib/types";
import { encodePlanData } from "@/lib/urlUtils";

interface ShareButtonsProps {
  input: UserInput;
  result: Itinerary;
  className?: string;
}

export default function ShareButtons({
  input,
  result,
  className = "",
}: ShareButtonsProps) {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const encoded = encodePlanData(input, result);
      const url = `${window.location.origin}${window.location.pathname}?q=${encoded}`;
      setShareUrl(url);
      setCanShare(!!navigator.share);
    }
  }, [input, result]); // This effect depends on input/result changes

  const shareText = `AIに旅行プランを作ってもらいました！\n目的地: ${
    result.destination
  }\nテーマ: ${input.theme.join(", ")}\n\n#AIトラベルプランナー #ともきち日記`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: `${result.destination}の旅行プラン`,
        text: shareText,
        url: shareUrl,
      });
    } catch (err) {
      console.log("Share canceled or failed", err);
    }
  };

  // Social Share Links
  const xShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
    shareText
  )}&url=${encodeURIComponent(shareUrl)}`;
  const lineShareUrl = `https://line.me/R/share?text=${encodeURIComponent(
    shareText + " " + shareUrl
  )}`;
  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}`;

  if (!shareUrl) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      <h4 className="text-sm font-bold text-white mb-3 text-center sm:text-left">
        Share this plan
      </h4>
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        {/* Native Share (Mobile) */}
        {canShare && (
          <button
            onClick={handleNativeShare}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
            aria-label="Share"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </button>
        )}

        {/* X (Twitter) */}
        <a
          href={xShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-full bg-black hover:bg-gray-900 text-white border border-white/20 transition-all flex items-center justify-center w-10 h-10"
          aria-label="Share on X"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" />
          </svg>
        </a>

        {/* LINE */}
        <a
          href={lineShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-full bg-[#06C755] hover:bg-[#05b34c] text-white transition-all flex items-center justify-center w-10 h-10"
          aria-label="Share on LINE"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M20.315 11.838c0-4.757-4.524-8.625-10.117-8.625S.081 7.081.081 11.838c0 4.237 3.551 7.784 8.277 8.502.825.176.671-.237.527.243.085.282.022.618-.117 1.056-.039.124-.176.619-.176.619s-.026.155-.043.218c-.287.973-1.258 1.944-4.223.18-.046-.027-.852-.408-2.61-1.637C.603 19.863.081 17.653.081 14.992c0-5.467 4.524-8.625 10.117-8.625s10.117 3.158 10.117 8.625-.081 3.153-.081 3.153z"
              fill="white"
              transform="translate(2, 2) scale(0.8)"
            />
            <text
              x="50%"
              y="54%"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fontWeight="bold"
              fill="white"
            >
              L
            </text>
          </svg>
        </a>

        {/* Facebook */}
        <a
          href={fbShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-full bg-[#1877F2] hover:bg-[#166fe5] text-white transition-all flex items-center justify-center w-10 h-10"
          aria-label="Share on Facebook"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M9.945 22v-8.834H6.946v-3.422h2.999V7.202c0-2.956 1.792-4.593 4.453-4.593 1.277 0 2.628.228 2.628.228v2.887h-1.48c-1.463 0-1.916.907-1.916 1.837v2.181h3.24l-.519 3.422h-2.72V22h-3.684z" />
          </svg>
        </a>

        {/* Copy Link */}
        <button
          onClick={handleCopy}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all relative w-10 h-10 flex items-center justify-center"
          aria-label="Copy Link"
        >
          {copied ? (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded shadow whitespace-nowrap">
              Copied!
            </span>
          ) : null}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}
