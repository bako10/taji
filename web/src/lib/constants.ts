// Libellés métier (portés de la PWA v1).

export const PRODUITS: Record<string, string> = {
  essence: 'Essence',
  gasoil: 'Gasoil',
  petrole: 'Pétrole lampant',
  melange: 'Mélange',
}

export const METHODES: Record<string, string> = {
  especes: '💵 Espèces',
  orange_money: '🟠 Orange Money',
  moov_money: '🔵 Moov Money',
  credit: '📒 Crédit client',
}

export const EXP_CATS: Record<string, string> = {
  salaire: 'Salaire',
  maintenance: 'Maintenance',
  electricite: 'Électricité',
  transport: 'Transport',
  taxe: 'Taxe',
  carburant: 'Carburant',
  autre: 'Autre',
}

export type Role = 'proprietaire' | 'gerant' | 'pompiste'
