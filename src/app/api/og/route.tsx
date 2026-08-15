import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get("title") || "MCJP.io | Master of Family, Money & Life";
    const category = (searchParams.get("category") || "Discipline").toUpperCase();
    const readTime = searchParams.get("readTime") || "5 min read";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#0b0f19",
            backgroundImage: "radial-gradient(circle at 25% 25%, #1e293b 0%, #0b0f19 70%)",
            padding: "60px 70px",
            fontFamily: "sans-serif",
            color: "#f8fafc",
          }}
        >
          {/* Header Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #d97706, #b45309)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: "20px",
                  fontWeight: "900",
                }}
              >
                M
              </div>
              <span style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "1px", color: "#f8fafc" }}>
                MCJP<span style={{ color: "#f59e0b" }}>.IO</span>
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                padding: "6px 16px",
                borderRadius: "30px",
                color: "#f59e0b",
                fontSize: "14px",
                fontWeight: "700",
                letterSpacing: "1.5px",
              }}
            >
              {category} • {readTime}
            </div>
          </div>

          {/* Title Middle */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                fontSize: title.length > 60 ? "46px" : "56px",
                fontWeight: "900",
                lineHeight: 1.15,
                color: "#ffffff",
                maxWidth: "1000px",
              }}
            >
              {title}
            </div>
          </div>

          {/* Footer Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              paddingTop: "30px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  backgroundColor: "#1e293b",
                  border: "2px solid #f59e0b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}
              >
                🩺
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>Peter K.</span>
                <span style={{ fontSize: "13px", color: "#94a3b8" }}>Clinical Pharmacist &amp; Systems Architect</span>
              </div>
            </div>

            <div style={{ fontSize: "15px", color: "#64748b", fontWeight: "600" }}>
              Wealth • Stoic Fatherhood • Cognitive Mastery
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate OG image: ${e.message}`, { status: 500 });
  }
}
