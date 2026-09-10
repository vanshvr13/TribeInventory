import React, { createContext, useContext, useEffect, useState } from "react";

export const CURRENCIES = ["RON", "USD", "INR"];
const CURRENCY_LOCALE = { RON: "ro-RO", USD: "en-US", INR: "en-IN" };

const STRINGS = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.allFolders": "All folders",
    "nav.expiring": "Expiring / Expired",
    "nav.shopping": "Shopping list",
    "nav.activity": "Activity",
    "nav.newFolder": "New folder",
    "nav.settings": "Settings",
    "nav.signOut": "Sign out",

    "btn.addItem": "Add item",
    "btn.export": "Export",
    "btn.cancel": "Cancel",
    "btn.save": "Save changes",
    "btn.saving": "Saving…",
    "btn.add": "Add",
    "btn.done": "Done",
    "btn.deleteItem": "Delete item",
    "btn.yesDelete": "Yes, delete",
    "btn.addFolder": "Add folder",
    "btn.deleteFolder": "Delete folder",
    "btn.capture": "Capture",

    "search.items": "Search items",
    "search.all": "Search all items",
    "sort.name": "Name (A–Z)",
    "sort.quantity": "Quantity",
    "sort.newest": "Recently updated",
    "sort.oldest": "Oldest updated",

    "stats.folders": "Folders",
    "stats.items": "Items",
    "stats.units": "Units",
    "stats.totalValue": "Total value",
    "stats.expiringSoon": "Expiring soon ({n})",

    "dash.summary": "Inventory Summary",
    "dash.restock": "Items that need restocking",
    "dash.recentItems": "Recent Items",
    "dash.recentActivity": "Recent Activity",
    "dash.viewAll": "View all {n} items",
    "dash.viewAllActivity": "View all activity",
    "dash.outOfStock": "OUT OF STOCK",
    "dash.allStocked": "Everything is stocked up.",
    "dash.noActivity": "No activity yet.",
    "dash.need": "Need {n} {unit}",

    "empty.items": "No items here yet.",
    "empty.shopping": "Nothing low on stock.",
    "empty.search": "No items match your search.",
    "shopping.noProvider": "No provider set",

    "act.changesLogged": "Changes logged",
    "act.consumedMonth": "Consumed this month",
    "act.restockedMonth": "Restocked this month",
    "act.empty": "No activity logged yet. It fills in as you add, edit, and use items.",
    "act.someone": "Someone",
    "act.increased": "{user} increased quantity of {item} by {amount} to {total}",
    "act.decreased": "{user} decreased quantity of {item} by {amount} to {total}",
    "act.updated": "{user} updated {fields} of {item}",
    "act.created": "{user} added {item}",
    "act.deleted": "{user} deleted {item}",

    "field.name": "Name",
    "field.brand": "Brand",
    "field.provider": "Provider",
    "field.expiry": "Expiry date",
    "field.minLevel": "Min level",
    "field.price": "Price",
    "field.unit": "Unit",
    "field.folder": "Folder",
    "field.photos": "Photos",

    "item.add": "Add item",
    "item.edit": "Edit item",
    "item.name": "Name",
    "item.namePh": "e.g. Water 2L",
    "item.brand": "Brand",
    "item.optional": "Optional",
    "item.expiry": "Expiry date",
    "item.provider": "Provider",
    "item.providerPh": "Optional — who you buy this from",
    "item.quantity": "Quantity",
    "item.unit": "Unit",
    "item.minLevel": "Min level",
    "item.minLevelPh": "Alert threshold",
    "item.price": "Price per unit",
    "item.total": "Item total valuation",
    "item.photos": "Photos ({n}/8)",
    "item.identify": "Identify with AI",
    "item.identifying": "Identifying…",
    "item.folder": "Folder",
    "item.newFolderInline": "+ New folder",
    "item.folderNamePh": "Folder name",
    "item.reason": "Reason for quantity change",
    "item.reasonPh": "Select a reason…",
    "item.added": "Added {date}",
    "item.updatedAt": "Last updated {date}",
    "item.deleteQ": "Delete this item?",
    "camera.title": "Take photo",

    "reason.Restock": "Restock",
    "reason.Inventory count": "Inventory count",
    "reason.Consumed": "Consumed",
    "reason.Returned": "Returned",

    "unit.unit": "unit",
    "unit.box": "box",
    "unit.kg": "kg",
    "unit.g": "g",
    "unit.l": "l",
    "unit.ml": "ml",
    "unit.pack": "pack",

    "folder.add": "Add folder",
    "folder.name": "Name",
    "folder.namePh": "e.g. Beverages",
    "folder.parent": "Parent folder",
    "folder.noParent": "No parent (top level)",
    "folder.deleteQ": 'Delete "{name}"?',
    "folder.deleteCascade":
      "This also deletes {folders} subfolder(s) and {items} item(s) inside it. This can't be undone.",
    "folder.deleteSimple": "This can't be undone.",

    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.currency": "Currency",
    "settings.currencyNote": "Display only — existing prices are not converted.",

    "login.title": "Sign in",
    "login.email": "Email",
    "login.password": "Password",
    "login.error": "Incorrect email or password.",
    "login.loading": "Signing in…",
    "app.loading": "Loading…",

    "csv.provider": "Provider",
    "csv.name": "Name",
    "csv.brand": "Brand",
    "csv.have": "Have",
    "csv.need": "Need",
    "csv.unit": "Unit",
  },
  ro: {
    "nav.dashboard": "Panou",
    "nav.allFolders": "Toate folderele",
    "nav.expiring": "Expiră / Expirate",
    "nav.shopping": "Listă de cumpărături",
    "nav.activity": "Activitate",
    "nav.newFolder": "Folder nou",
    "nav.settings": "Setări",
    "nav.signOut": "Deconectare",

    "btn.addItem": "Adaugă articol",
    "btn.export": "Exportă",
    "btn.cancel": "Anulează",
    "btn.save": "Salvează",
    "btn.saving": "Se salvează…",
    "btn.add": "Adaugă",
    "btn.done": "Gata",
    "btn.deleteItem": "Șterge articolul",
    "btn.yesDelete": "Da, șterge",
    "btn.addFolder": "Adaugă folder",
    "btn.deleteFolder": "Șterge folderul",
    "btn.capture": "Capturează",

    "search.items": "Caută articole",
    "search.all": "Caută în toate articolele",
    "sort.name": "Nume (A–Z)",
    "sort.quantity": "Cantitate",
    "sort.newest": "Actualizate recent",
    "sort.oldest": "Actualizate demult",

    "stats.folders": "Foldere",
    "stats.items": "Articole",
    "stats.units": "Unități",
    "stats.totalValue": "Valoare totală",
    "stats.expiringSoon": "Expiră curând ({n})",

    "dash.summary": "Sumar inventar",
    "dash.restock": "Articole de reaprovizionat",
    "dash.recentItems": "Articole recente",
    "dash.recentActivity": "Activitate recentă",
    "dash.viewAll": "Vezi toate cele {n} articole",
    "dash.viewAllActivity": "Vezi toată activitatea",
    "dash.outOfStock": "STOC EPUIZAT",
    "dash.allStocked": "Totul este aprovizionat.",
    "dash.noActivity": "Nicio activitate încă.",
    "dash.need": "Necesar {n} {unit}",

    "empty.items": "Niciun articol aici încă.",
    "empty.shopping": "Nimic sub stocul minim.",
    "empty.search": "Niciun articol nu corespunde căutării.",
    "shopping.noProvider": "Fără furnizor",

    "act.changesLogged": "Modificări înregistrate",
    "act.consumedMonth": "Consumat luna aceasta",
    "act.restockedMonth": "Reaprovizionat luna aceasta",
    "act.empty": "Nicio activitate încă. Se completează pe măsură ce adaugi, editezi și consumi articole.",
    "act.someone": "Cineva",
    "act.increased": "{user} a crescut cantitatea de {item} cu {amount}, până la {total}",
    "act.decreased": "{user} a scăzut cantitatea de {item} cu {amount}, până la {total}",
    "act.updated": "{user} a actualizat {fields} pentru {item}",
    "act.created": "{user} a adăugat {item}",
    "act.deleted": "{user} a șters {item}",

    "field.name": "Nume",
    "field.brand": "Marcă",
    "field.provider": "Furnizor",
    "field.expiry": "Data expirării",
    "field.minLevel": "Nivel minim",
    "field.price": "Preț",
    "field.unit": "Unitate",
    "field.folder": "Folder",
    "field.photos": "Poze",

    "item.add": "Adaugă articol",
    "item.edit": "Editează articolul",
    "item.name": "Nume",
    "item.namePh": "ex. Apă 2L",
    "item.brand": "Marcă",
    "item.optional": "Opțional",
    "item.expiry": "Data expirării",
    "item.provider": "Furnizor",
    "item.providerPh": "Opțional — de unde cumperi",
    "item.quantity": "Cantitate",
    "item.unit": "Unitate",
    "item.minLevel": "Nivel minim",
    "item.minLevelPh": "Prag de alertă",
    "item.price": "Preț pe unitate",
    "item.total": "Valoare totală articol",
    "item.photos": "Poze ({n}/8)",
    "item.identify": "Identifică cu AI",
    "item.identifying": "Se identifică…",
    "item.folder": "Folder",
    "item.newFolderInline": "+ Folder nou",
    "item.folderNamePh": "Nume folder",
    "item.reason": "Motivul modificării cantității",
    "item.reasonPh": "Alege un motiv…",
    "item.added": "Adăugat {date}",
    "item.updatedAt": "Ultima actualizare {date}",
    "item.deleteQ": "Ștergi acest articol?",
    "camera.title": "Fă o poză",

    "reason.Restock": "Reaprovizionare",
    "reason.Inventory count": "Inventariere",
    "reason.Consumed": "Consumat",
    "reason.Returned": "Returnat",

    "unit.unit": "buc",
    "unit.box": "cutie",
    "unit.kg": "kg",
    "unit.g": "g",
    "unit.l": "l",
    "unit.ml": "ml",
    "unit.pack": "pachet",

    "folder.add": "Adaugă folder",
    "folder.name": "Nume",
    "folder.namePh": "ex. Băuturi",
    "folder.parent": "Folder părinte",
    "folder.noParent": "Fără părinte (nivel principal)",
    "folder.deleteQ": "Ștergi „{name}”?",
    "folder.deleteCascade":
      "Se vor șterge și {folders} subfolder(e) și {items} articol(e) din interior. Nu se poate anula.",
    "folder.deleteSimple": "Nu se poate anula.",

    "settings.title": "Setări",
    "settings.language": "Limbă",
    "settings.currency": "Monedă",
    "settings.currencyNote": "Doar afișare — prețurile existente nu sunt convertite.",

    "login.title": "Autentificare",
    "login.email": "Email",
    "login.password": "Parolă",
    "login.error": "Email sau parolă incorectă.",
    "login.loading": "Se autentifică…",
    "app.loading": "Se încarcă…",

    "csv.provider": "Furnizor",
    "csv.name": "Nume",
    "csv.brand": "Marcă",
    "csv.have": "Stoc",
    "csv.need": "Necesar",
    "csv.unit": "Unitate",
  },
};

function readStored(key, fallback, allowed) {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [lang, setLang] = useState(() => readStored("tribe.lang", "en", ["en", "ro"]));
  const [currency, setCurrency] = useState(() => readStored("tribe.currency", "RON", CURRENCIES));

  useEffect(() => {
    try {
      localStorage.setItem("tribe.lang", lang);
      localStorage.setItem("tribe.currency", currency);
    } catch {
      // storage unavailable — settings just won't persist
    }
  }, [lang, currency]);

  const t = (key, vars) => {
    let s = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
    if (vars) for (const k of Object.keys(vars)) s = s.replaceAll(`{${k}}`, String(vars[k]));
    return s;
  };

  const fmtMoney = (n) =>
    new Intl.NumberFormat(CURRENCY_LOCALE[currency], { style: "currency", currency }).format(n || 0);

  const fmtMoneyCompact = (n) =>
    new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n || 0);

  return (
    <SettingsContext.Provider
      value={{ lang, setLang, currency, setCurrency, t, fmtMoney, fmtMoneyCompact }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

// Interpolate {placeholders} in a translated string with React nodes.
export function fillJsx(template, vars) {
  return template.split(/(\{\w+\})/g).map((part, i) => {
    const m = part.match(/^\{(\w+)\}$/);
    return m ? <React.Fragment key={i}>{vars[m[1]]}</React.Fragment> : part;
  });
}
