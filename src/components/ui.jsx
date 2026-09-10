import React from "react";
import { X } from "lucide-react";

export function Modal({ title, onClose, children, footer, maxW = "max-w-md" }) {
  return (
    <div className="fixed inset-0 bg-stone-900 bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg w-full ${maxW} max-h-full flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 shrink-0">
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          {onClose && (
            <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-stone-200 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-stone-500">{label}</label>
      {children}
    </div>
  );
}

export const inputCls =
  "w-full border border-stone-300 rounded px-2.5 py-2 text-sm mt-1 outline-none focus:border-teal-600";

export const btnPrimary =
  "bg-teal-700 hover:bg-teal-800 disabled:bg-stone-300 text-white text-sm font-medium px-4 py-2 rounded";

export const btnGhost = "text-sm text-stone-600 px-3 py-2 hover:bg-stone-50 rounded";
