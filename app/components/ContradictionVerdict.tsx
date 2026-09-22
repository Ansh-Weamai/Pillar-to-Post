import { CheckCircle2, XCircle, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import type { ContradictionResult } from "@/app/lib/types";

export default function ContradictionVerdict({
  result,
  errorMessage,
  checking,
  onRetry,
}: {
  result: ContradictionResult | null;
  errorMessage: string | null;
  checking: boolean;
  onRetry: () => void;
}) {
  if (checking) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center text-ink-soft">
        <Loader2 size={24} className="animate-spin" />
        <span className="text-[14px]">Checking agreement…</span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
        <p className="text-[14px] font-semibold text-status-missing">{errorMessage}</p>
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-[6px] border border-line px-4 py-2 text-[14px] font-bold text-ink transition-colors hover:border-ptp-green hover:text-ptp-green"
        >
          <RotateCcw size={16} /> Retry
        </button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center text-ink-soft">
        <p className="text-[14px]">Pick a photo and finding text, then check agreement.</p>
      </div>
    );
  }

  const isMatch = result.verdict === "match";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-1 border-b border-line pb-4 text-center">
        {isMatch ? (
          <CheckCircle2 size={32} className="text-status-confirmed" />
        ) : (
          <XCircle size={32} className="text-status-missing" />
        )}
        <span className={`text-[18px] font-bold ${isMatch ? "text-status-confirmed" : "text-status-missing"}`}>
          {isMatch ? "MATCH" : "MISMATCH"}
        </span>
        <span className="text-[13px] text-ink-soft">confidence: {Math.round(result.confidence * 100)}%</span>
      </div>

      <p className="text-[14px] text-ink">{result.reasoning}</p>

      {result.omissions.length > 0 ? (
        <div className="rounded-[8px] border border-line bg-paper-warm p-3">
          <p className="mb-2 text-[13px] font-bold text-ink">Also spotted, not mentioned:</p>
          <ul className="flex flex-col gap-2">
            {result.omissions.map((o, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[13px] text-ink">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-status-partial" />
                <span>
                  {o.description}{" "}
                  <span className="text-ink-soft">
                    ({o.severity}, {Math.round(o.confidence * 100)}%)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="text-[13px] font-semibold text-ink-soft">Recommended action</span>
        <span
          className={`rounded-[6px] px-2.5 py-1 text-[12px] font-bold ${
            result.recommended_action === "pass"
              ? "bg-status-confirmed-tint text-status-confirmed"
              : "bg-status-partial-tint text-status-partial"
          }`}
        >
          {result.recommended_action === "pass" ? "Pass" : "Flag for review"}
        </span>
      </div>
    </div>
  );
}
