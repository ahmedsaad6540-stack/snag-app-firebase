import seeds from './seed.json'
import { PARK_SECTORS } from '../constants/parkStreetData.js'

// Reference plans are dormant until their recurrence and shift have been reviewed.
export const REFERENCE_PLANS = [
  ...seeds.map(p => ({ ...p, enabled: false })),
  ...PARK_SECTORS.flatMap(sector => sector.zones.flatMap(zone => zone.items.map(item => ({
    id: `standard-${sector.id}-${zone.id}-${item.id}`, department: 'standards', title: item.name,
    location: `${sector.name} / ${zone.title}`, standard: item.name, frequency: 'daily', shift: 'صباحية',
    enabled: false, review: '', source: 'معايير فحص بارك ستريت الموجودة بالتطبيق',
  })))),
]
