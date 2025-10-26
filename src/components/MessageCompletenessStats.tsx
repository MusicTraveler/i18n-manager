import type { Message } from "@/lib/client";

interface CompletenessStat {
  locale: string;
  count: number;
  total: number;
  missing: number;
  percentage: number;
}

interface MessageCompletenessStatsProps {
  messages: Message[];
  stats: CompletenessStat[];
}

export function MessageCompletenessStats({ messages, stats }: MessageCompletenessStatsProps) {
  if (messages.length === 0) return null;

  return (
    <div className="message-completeness-stats" style={{ background: "#2b3d52", padding: "15px", borderRadius: "4px", marginBottom: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(stats.length, 6)}, 1fr)`, gap: "10px" }}>
        {stats.map((stat) => (
          <div
            key={stat.locale}
            style={{
              padding: "10px",
              background: stat.percentage === 100 ? "#0F9960" : stat.percentage < 50 ? "#DB3737" : "#D9822B",
              borderRadius: "4px",
              textAlign: "center",
            }}
          >
            <div style={{ color: "white", fontWeight: "bold", marginBottom: "5px" }}>
              {stat.locale.toUpperCase()}
            </div>
            <div style={{ color: "white", fontSize: "14px" }}>
              {stat.count} / {stat.total} ({stat.percentage}%)
            </div>
            {stat.missing > 0 && (
              <div style={{ color: "white", fontSize: "12px", marginTop: "5px" }}>
                {stat.missing} missing
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

