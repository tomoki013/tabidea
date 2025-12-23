import { useState, useEffect } from "react";
import { Itinerary, UserInput } from "@/lib/types";
import { encodePlanData } from "@/lib/urlUtils";
import { FaTwitter, FaFacebook, FaLine, FaLink, FaShareAlt } from "react-icons/fa";

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
      <h4 className="text-sm font-bold text-white mb-3 text-center sm:text-left flex items-center gap-2">
        <FaShareAlt /> Share this plan
      </h4>
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        {/* Native Share (Mobile) */}
        {canShare && (
          <button
            onClick={handleNativeShare}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all w-10 h-10 flex items-center justify-center"
            aria-label="Share"
          >
            <FaShareAlt size={18} />
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
          <FaTwitter size={16} />
        </a>

        {/* LINE */}
        <a
          href={lineShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-full bg-[#06C755] hover:bg-[#05b34c] text-white transition-all flex items-center justify-center w-10 h-10"
          aria-label="Share on LINE"
        >
          <FaLine size={20} />
        </a>

        {/* Facebook */}
        <a
          href={fbShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-full bg-[#1877F2] hover:bg-[#166fe5] text-white transition-all flex items-center justify-center w-10 h-10"
          aria-label="Share on Facebook"
        >
          <FaFacebook size={18} />
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
          <FaLink size={16} />
        </button>
      </div>
    </div>
  );
}
