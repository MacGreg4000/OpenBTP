// Jours fériés légaux belges (approximatifs; certaines fêtes mobiles varient)
// Pour démo: calcul simple de Paques et dates fixes

function easterSunday(year: number) {
  // Algorithme de Meeus/Jones/Butcher
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

export function belgianHolidays(year: number): Set<string> {
  const set = new Set<string>()
  const add = (d: Date) => set.add(new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10))
  // Fixes
  add(new Date(year, 0, 1)) // Nouvel An
  add(new Date(year, 4, 1)) // Fête du Travail
  add(new Date(year, 6, 21)) // Fête Nationale
  add(new Date(year, 7, 15)) // Assomption
  add(new Date(year, 10, 1)) // Toussaint
  add(new Date(year, 10, 11)) // Armistice
  add(new Date(year, 11, 25)) // Noël
  // Mobiles
  const easter = easterSunday(year)
  const addDays = (base: Date, n: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate()+n)
  add(addDays(easter, 1)) // Lundi de Pâques
  add(addDays(easter, 39)) // Ascension
  add(addDays(easter, 50)) // Lundi de Pentecôte
  return set
}

