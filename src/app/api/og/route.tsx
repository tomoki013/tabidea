import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

// ============================================================================
// Configuration
// ============================================================================

export const runtime = "edge";

// ============================================================================
// Font Loading
// ============================================================================

// Load Noto Sans JP font for Japanese text
async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(
      new URL(
        "https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj757Y0rw-oME.ttf"
      )
    );
    if (!response.ok) return null;
    return response.arrayBuffer();
  } catch {
    return null;
  }
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Extract parameters
  const destination = searchParams.get("destination") || "旅行プラン";
  const days = searchParams.get("days") || "";
  const imageUrl = searchParams.get("imageUrl") || "";

  // Duration text formatting
  let durationText = "";
  if (days) {
    const dayNum = parseInt(days);
    if (dayNum === 1) {
      durationText = "日帰り";
    } else if (dayNum > 1) {
      durationText = `${dayNum - 1}泊${dayNum}日`;
    }
  }

  // Load font
  const fontData = await loadFont();

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            fontFamily: fontData ? "Noto Sans JP, sans-serif" : "sans-serif",
          }}
        >
          {/* Background Image or Gradient */}
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            />
          )}

          {/* Overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: imageUrl
                ? "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7))"
                : "transparent",
            }}
          />

          {/* Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              textAlign: "center",
              padding: "40px",
            }}
          >
            {/* Duration Badge */}
            {durationText && (
              <div
                style={{
                  display: "flex",
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  color: "#e67e22",
                  padding: "12px 32px",
                  borderRadius: "50px",
                  fontSize: "28px",
                  fontWeight: "bold",
                  marginBottom: "24px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                }}
              >
                {durationText}
              </div>
            )}

            {/* Destination Name */}
            <div
              style={{
                display: "flex",
                fontSize: "72px",
                fontWeight: "bold",
                color: "white",
                textShadow: "0 4px 20px rgba(0,0,0,0.5)",
                marginBottom: "20px",
                maxWidth: "900px",
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              {destination}の旅
            </div>

            {/* Tagline */}
            <div
              style={{
                display: "flex",
                fontSize: "32px",
                color: "rgba(255,255,255,0.9)",
                textShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              AIがあなただけの旅程を作成
            </div>
          </div>

          {/* Logo/Branding */}
          <div
            style={{
              position: "absolute",
              bottom: "40px",
              right: "40px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              backgroundColor: "rgba(255,255,255,0.95)",
              padding: "16px 24px",
              borderRadius: "16px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            {/* Plane Icon */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#e67e22"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
            <span
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#e67e22",
              }}
            >
              Tabidea
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: fontData
          ? [
              {
                name: "Noto Sans JP",
                data: fontData,
                weight: 700,
                style: "normal",
              },
            ]
          : [],
      }
    );
  } catch (e) {
    console.error("OGP generation error:", e);

    // Fallback simple response
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #e67e22 0%, #d35400 100%)",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              fontWeight: "bold",
              color: "white",
            }}
          >
            {destination}
          </div>
          <div
            style={{
              fontSize: "32px",
              color: "rgba(255,255,255,0.9)",
              marginTop: "20px",
            }}
          >
            Tabidea - AI Travel Planner
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
