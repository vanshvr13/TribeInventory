import React from "react";
import { FileText, Folder, Banknote, ImagePlus } from "lucide-react";
import { useSettings } from "../lib/i18n.jsx";
import { trimNum, formatWhen } from "../lib/format.js";
import { ActivityLine } from "./ActivityView.jsx";

function SummaryCard({ icon: Icon, iconCls, value, label }) {
  return (
    <div className="flex-1 min-w-[160px] bg-white border border-stone-200 rounded-lg px-5 py-4 flex items-center gap-4">
      <div className={`rounded-full p-2.5 ${iconCls}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-stone-900 leading-tight">{value}</div>
        <div className="text-sm text-stone-500">{label}</div>
      </div>
    </div>
  );
}

function MiniItemCard({ item, onClick, badge, footer }) {
  return (
    <button
      onClick={onClick}
      className="w-44 shrink-0 bg-white border border-stone-200 rounded-lg overflow-hidden text-left hover:border-teal-400 transition-colors"
    >
      <div className="aspect-square bg-stone-100 flex items-center justify-center relative">
        {item.photos[0] ? (
          <img src={item.photos[0]} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <ImagePlus size={26} className="text-stone-300" />
        )}
        {badge && (
          <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <div className="text-sm font-medium text-stone-900 truncate">{item.name}</div>
        <div className="text-xs text-stone-500 mt-1 truncate">{footer}</div>
      </div>
    </button>
  );
}

function Section({ title, action, children }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-stone-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard({ items, folders, logs, onOpenItem, onGo }) {
  const { t, lang, fmtMoney, fmtMoneyCompact } = useSettings();

  const totalValue = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.price || 0), 0);
  const shoppingItems = items.filter((it) => it.minLevel !== null && it.quantity < it.minLevel);
  const recentItems = [...items]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 10);
  const recentLogs = [...logs]
    .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""))
    .slice(0, 6);

  const valueLine = (it) => `${trimNum(it.quantity)} ${t(`unit.${it.unit}`)} · ${fmtMoney(it.quantity * (it.price || 0))}`;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-base font-semibold text-stone-900 mb-3">{t("dash.summary")}</h2>
        <div className="flex flex-wrap gap-3">
          <SummaryCard icon={FileText} iconCls="bg-blue-100 text-blue-600" value={items.length} label={t("stats.items")} />
          <SummaryCard icon={Folder} iconCls="bg-amber-100 text-amber-600" value={folders.length} label={t("stats.folders")} />
          <SummaryCard
            icon={Banknote}
            iconCls="bg-orange-100 text-orange-600"
            value={fmtMoneyCompact(totalValue)}
            label={t("stats.totalValue")}
          />
        </div>
      </div>

      <Section
        title={t("dash.restock")}
        action={
          shoppingItems.length > 0 && (
            <button onClick={() => onGo({ kind: "shopping" })} className="text-sm text-teal-700 hover:underline shrink-0">
              {t("dash.viewAll", { n: shoppingItems.length })}
            </button>
          )
        }
      >
        {shoppingItems.length === 0 ? (
          <div className="text-sm text-stone-400">{t("dash.allStocked")}</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {shoppingItems.slice(0, 10).map((it) => (
              <MiniItemCard
                key={it.id}
                item={it}
                onClick={() => onOpenItem(it)}
                badge={it.quantity <= 0 ? t("dash.outOfStock") : null}
                footer={valueLine(it)}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title={t("dash.recentItems")}>
        {recentItems.length === 0 ? (
          <div className="text-sm text-stone-400">{t("empty.items")}</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentItems.map((it) => (
              <MiniItemCard key={it.id} item={it} onClick={() => onOpenItem(it)} footer={valueLine(it)} />
            ))}
          </div>
        )}
      </Section>

      <Section
        title={t("dash.recentActivity")}
        action={
          logs.length > 0 && (
            <button onClick={() => onGo({ kind: "activity" })} className="text-sm text-teal-700 hover:underline shrink-0">
              {t("dash.viewAllActivity")}
            </button>
          )
        }
      >
        {recentLogs.length === 0 ? (
          <div className="text-sm text-stone-400">{t("dash.noActivity")}</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {recentLogs.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-4 py-2.5 text-sm text-stone-700">
                <div className="min-w-0 truncate">
                  <ActivityLine log={l} />
                </div>
                <div className="text-xs text-stone-400 shrink-0">{l.timestamp ? formatWhen(l.timestamp, lang) : ""}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
