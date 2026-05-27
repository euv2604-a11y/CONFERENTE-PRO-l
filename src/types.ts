export interface ERPRecord {
  id: string;
  barcode: string;
  lastSixDigits: string;
  date: string; // data
  time: string; // hora
  origin: string; // origem (FACÇÃO, PENITENCIÁRIA, MATRIZ, ITUPORANGA)
  order: string; // ordem (OS / OP - 6 últimos dígitos)
  pen: string; // PEN
  nf: string; // NF
  kg: number; // kg (KILO)
  washing: string; // lavação (LAVAÇÃO)
  crates: number; // grades (GRADES)
  boxes: number; // caixas (CAIXAS)
  packaging: string; // embalagem
  obs: string; // obs (OBS)
  conferente: string; // Conferente / Operador
  motorista: string; // Motorista
}

export interface PresetProduct {
  barcodeSuffix: string; // last 6 digits match
  name: string;
  defaultOrigin: string;
  defaultPen: string;
  defaultKg: number;
  defaultWashing: string;
  defaultPackaging: string;
}

export interface OfflineSyncStatus {
  isOffline: boolean;
  pendingSyncCount: number;
  lastSaved: string;
}
