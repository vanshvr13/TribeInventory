import React from "react";
import { useSettings, fillJsx } from "../lib/i18n.jsx";
import { trimNum, formatWhen } from "../lib/format.js";

// One human-readable sentence for a log entry, e.g.
// "vansh increased quantity of Coffee beans by 1 kg to 3 kg"
export function ActivityLine({ log }) {
  const { t } = useSettings();
  const user = <b className="text-stone-900">{log.user ? log.user.split("@")[0] : t("act.someone")}</b>;
  const item = <b className="text-stone-900">{log.itemName}</b>;

  if (log.type === "quantity") {
    const unit = t(`unit.${log.unit || "unit"}`);
    return fillJsx(t(log.delta >= 0 ? "act.increased" : "act.decreased"), {
      user,
      item,
      amount: `${trimNum(Math.abs(log.delta))} ${unit}`,
      total: `${trimNum(log.newQuantity)} ${unit}`,
    });
  }
  if (log.type === "updated") {
    return fillJsx(t("act.updated"), {
      user,
      item,
      fields: (log.changedFields || []).map((f) => t(`field.${f}`)).join(", "),
    });
  }
  return fillJsx(t(log.type === "created" ? "act.created" : "act.deleted"), { user, item });
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-stone-200 rounded-md px-4 py-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-lg font-semibold text-stone-900">{value}</div>
    </div>
  );
}

export default function ActivityView({ logs }) {
  const { t, lang } = useSettings();

  if (logs.length === 0) {
    return <div className="text-center text-stone-400 text-sm mt-16">{t("act.empty")}</div>;
  }

  const now = new Date();
  const thisMonth = (ts) => {
    const d = new Date(ts);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
  const quantityLogs = logs.filter((l) => l.type === "quantity" && thisMonth(l.timestamp));
  const consumed = quantityLogs
    .filter((l) => l.reason === "Consumed")
    .reduce((sum, l) => sum + Math.abs(l.delta), 0);
  const restocked = quantityLogs
    .filter((l) => l.reason === "Restock")
    .reduce((sum, l) => sum + l.delta, 0);

  const sorted = [...logs].sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap gap-3 mb-5">
        <StatCard label={t("act.changesLogged")} value={logs.length} />
        <StatCard label={t("act.consumedMonth")} value={trimNum(consumed)} />
        <StatCard label={t("act.restockedMonth")} value={trimNum(restocked)} />
      </div>
      <div className="space-y-1.5">
        {sorted.map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between gap-3 bg-white border border-stone-200 rounded-md px-4 py-2.5 text-sm"
          >
            <div className="min-w-0 text-stone-700">
              <ActivityLine log={l} />
              <div className="text-xs text-stone-400 mt-0.5">{l.timestamp ? formatWhen(l.timestamp, lang) : ""}</div>
            </div>
            {l.type === "quantity" && (
              <div className="text-right shrink-0">
                <div
                  className={`text-xs font-medium px-1.5 py-0.5 rounded inline-block ${
                    l.reason === "Consumed"
                      ? "bg-red-100 text-red-700"
                      : l.reason === "Restock"
                      ? "bg-teal-100 text-teal-700"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {t(`reason.${l.reason}`)}
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {trimNum(l.previousQuantity)} → {trimNum(l.newQuantity)} {t(`unit.${l.unit || "unit"}`)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
