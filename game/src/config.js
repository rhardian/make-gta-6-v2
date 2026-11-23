// Core constants, 7 districts, 18 vehicles, 8 weapons, 5 wanted tiers, and 4 FM radio stations
// for Solaria Bay: Sun & Syndicate.

export const STEP = 1 / 60;
export const SAVE_STORAGE_KEY = 'solaria_bay_3d_saves_v1';

export const WORLD = {
  blockPitch: 120,
  roadWidth: 26,
  sidewalkWidth: 6,
  avenuesX: [-360, -240, -120, 0, 120, 240],
  streetsZ: [-360, -240, -120, 0, 120, 240, 360],
  minX: -410,
  maxX: 820,
  minZ: -410,
  maxZ: 410,
  promenadeStartX: 253,
  beachStartX: 268,
  shorelineX: 320,
  bridgeZ: 0,
  bridgeStartX: 260,
  bridgeEndX: 556,
  bridgePeakY: 18,
  pierZ: 120,
  pierStartX: 266,
  pierEndX: 418,
  isleMinX: 520,
  isleMaxX: 760,
  isleMinZ: -210,
  isleMaxZ: 210,
  defaultTime: 17.65, // Warm golden-hour coastal sunlight
};

export const AVENUE_NAMES = {
  '-360': 'Cobre West Blvd',
  '-240': 'Palma Ridge Ave',
  '-120': 'Brisa Market Way',
  '0': 'Solaria Grand Ave',
  '120': 'Meridian Plaza Blvd',
  '240': 'Ocean Palm Blvd',
  '560': 'Starlight West Loop',
  '720': 'Starlight Bay Drive',
};

export const STREET_NAMES = {
  '-360': 'Mirage North Ave',
  '-240': 'Neon Crest St',
  '-120': 'Sunset Plaza St',
  '0': 'Solaria Bridge Blvd',
  '120': 'Coral Pier Way',
  '240': 'Harbor Canal Rd',
  '360': 'Cobre Freight Ave',
};

export const DISTRICTS = [
  { id: 'coral_promenade', name: 'Coral Promenade', sub: 'Art Deco Beachfront & Boardwalk', minX: 150, maxX: 335, minZ: -260, maxZ: 220, color: '#ff6b8b', hMin: 18, hMax: 44 },
  { id: 'solaria_downtown', name: 'Solaria Downtown', sub: 'Financial Towers & Helipads', minX: -150, maxX: 150, minZ: -165, maxZ: 165, color: '#38bdf8', hMin: 46, hMax: 108 },
  { id: 'mirage_strip', name: 'Mirage Strip', sub: 'Lounges, Neon & Nightlife', minX: -180, maxX: 240, minZ: -410, maxZ: -165, color: '#c084fc', hMin: 24, hMax: 60 },
  { id: 'palma_vista', name: 'Palma Vista', sub: 'Hillside Villas & Palm Groves', minX: -410, maxX: -150, minZ: -410, maxZ: 0, color: '#fb923c', hMin: 12, hMax: 28 },
  { id: 'little_brisa', name: 'Little Brisa', sub: 'Cantinas, Markets & Murals', minX: -410, maxX: -150, minZ: 0, maxZ: 185, color: '#f43f5e', hMin: 12, hMax: 26 },
  { id: 'cobre_docks', name: 'Cobre Docks', sub: 'Freight Terminals & Cranes', minX: -410, maxX: 240, minZ: 185, maxZ: 410, color: '#f59e0b', hMin: 14, hMax: 30 },
  { id: 'starlight_isle', name: 'Starlight Isle', sub: 'Resort Mansions & Yacht Basin', minX: 495, maxX: 790, minZ: -240, maxZ: 240, color: '#2dd4bf', hMin: 14, hMax: 34 },
];

export const VEHICLES = {
  mako_v12: { id: 'mako_v12', name: 'Mako V12 GT', cls: 'Supercar', style: 'super', l: 4.9, w: 2.18, h: 1.24, maxSpd: 72, accel: 48, turn: 2.45, hp: 260, colors: ['#e11d48', '#ff4d6d', '#0ea5e9', '#f59e0b'], stripe: '#111827', spoiler: true },
  aureo_cabrio: { id: 'aureo_cabrio', name: 'Aureo Cabrio', cls: 'Convertible', style: 'cabrio', l: 4.7, w: 2.08, h: 1.18, maxSpd: 64, accel: 42, turn: 2.55, hp: 220, colors: ['#fb7185', '#fde047', '#38bdf8', '#f97316'], openTop: true },
  solaria_coupe: { id: 'solaria_coupe', name: 'Solaria GT Coupe', cls: 'Sports', style: 'coupe', l: 4.65, w: 2.04, h: 1.28, maxSpd: 62, accel: 40, turn: 2.4, hp: 230, colors: ['#2dd4bf', '#a855f7', '#f43f5e', '#f8fafc'], spoiler: true },
  tormenta_muscle: { id: 'tormenta_muscle', name: 'Tormenta Sabre V8', cls: 'Muscle', style: 'muscle', l: 4.95, w: 2.12, h: 1.34, maxSpd: 60, accel: 43, turn: 2.18, hp: 290, colors: ['#dc2626', '#f59e0b', '#059669', '#1e293b'], stripe: '#f8fafc', scoop: true },
  brisa_sedan: { id: 'brisa_sedan', name: 'Brisa Touring', cls: 'Sedan', style: 'sedan', l: 4.6, w: 1.98, h: 1.42, maxSpd: 48, accel: 30, turn: 2.2, hp: 210, colors: ['#60a5fa', '#cbd5e1', '#34d399', '#fbbf24', '#f472b6'] },
  palma_taxi: { id: 'palma_taxi', name: 'Solaria Bay Cab', cls: 'Taxi', style: 'taxi', l: 4.65, w: 2.0, h: 1.44, maxSpd: 49, accel: 31, turn: 2.28, hp: 220, colors: ['#facc15'], taxiSign: true },
  cobre_suv: { id: 'cobre_suv', name: 'Cobre Atlas 4x4', cls: 'SUV', style: 'suv', l: 5.05, w: 2.22, h: 1.82, maxSpd: 50, accel: 32, turn: 2.0, hp: 340, colors: ['#1e293b', '#b45309', '#475569', '#991b1b'] },
  boveda_armored: { id: 'boveda_armored', name: 'Boveda Bullion Van', cls: 'Armored', style: 'van', l: 5.7, w: 2.38, h: 2.28, maxSpd: 44, accel: 26, turn: 1.8, hp: 540, colors: ['#334155'], stripe: '#facc15', armored: true },
  mirage_limo: { id: 'mirage_limo', name: 'Mirage Stretch VIP', cls: 'Limousine', style: 'limo', l: 6.8, w: 2.1, h: 1.42, maxSpd: 48, accel: 28, turn: 1.72, hp: 310, colors: ['#0f172a', '#f8fafc'] },
  docks_pickup: { id: 'docks_pickup', name: 'Cobre Hauler', cls: 'Pickup', style: 'pickup', l: 5.2, w: 2.16, h: 1.78, maxSpd: 47, accel: 30, turn: 2.05, hp: 310, colors: ['#ea580c', '#0284c7', '#475569'] },
  cargo_boxtruck: { id: 'cargo_boxtruck', name: 'Solaria Freight', cls: 'Truck', style: 'truck', l: 6.4, w: 2.42, h: 2.75, maxSpd: 39, accel: 21, turn: 1.65, hp: 460, colors: ['#e2e8f0', '#fcd34d'] },
  vortex_moto: { id: 'vortex_moto', name: 'Vortex R9 Bike', cls: 'Motorcycle', style: 'moto', l: 2.35, w: 0.88, h: 1.12, maxSpd: 68, accel: 52, turn: 2.95, hp: 145, colors: ['#ef4444', '#22d3ee', '#a855f7'], isBike: true },
  palma_scooter: { id: 'palma_scooter', name: 'Brisa Scooter', cls: 'Scooter', style: 'scooter', l: 2.05, w: 0.8, h: 1.05, maxSpd: 40, accel: 30, turn: 3.1, hp: 115, colors: ['#2dd4bf', '#fb7185', '#fde047'], isBike: true },
  sbpd_cruiser: { id: 'sbpd_cruiser', name: 'SBPD Interceptor', cls: 'Police', style: 'police', l: 4.85, w: 2.1, h: 1.44, maxSpd: 64, accel: 44, turn: 2.45, hp: 300, colors: ['#0f172a'], isPolice: true },
  sbpd_enforcer: { id: 'sbpd_enforcer', name: 'SBPD Pursuit SUV', cls: 'Police SUV', style: 'police_suv', l: 5.15, w: 2.24, h: 1.86, maxSpd: 58, accel: 38, turn: 2.15, hp: 390, colors: ['#111827'], isPolice: true },
  sbpd_swat: { id: 'sbpd_swat', name: 'SBPD SWAT Bearcat', cls: 'SWAT', style: 'swat', l: 5.85, w: 2.46, h: 2.45, maxSpd: 52, accel: 32, turn: 1.85, hp: 560, colors: ['#172554'], isPolice: true, armored: true },
  corsair_boat: { id: 'corsair_boat', name: 'Corsair 380 Boat', cls: 'Speedboat', style: 'boat', l: 6.2, w: 2.4, h: 1.45, maxSpd: 56, accel: 38, turn: 2.1, hp: 280, colors: ['#f8fafc', '#22d3ee'], stripe: '#ff4d6d', isBoat: true },
  sbpd_air1: { id: 'sbpd_air1', name: 'AIR-1 SBPD Falcon', cls: 'Helicopter', style: 'heli', l: 9.2, w: 2.6, h: 3.1, maxSpd: 65, accel: 36, turn: 2.0, hp: 620, colors: ['#0f172a'], isPolice: true, isHeli: true },
};

export const WEAPONS = [
  { id: 'fists', name: 'Street Brawl', short: 'FISTS', dmg: 26, cd: 0.36, range: 3.4, spread: 0, pellets: 1, ammo: 0, inf: true, color: '#f8fafc', price: 0 },
  { id: 'viper_9mm', name: 'Viper 9mm', short: '9MM', dmg: 32, cd: 0.22, range: 90, spread: 0.025, pellets: 1, ammo: 140, color: '#fde047', price: 800 },
  { id: 'stinger_smg', name: 'Stinger SMG', short: 'SMG', dmg: 24, cd: 0.09, range: 85, spread: 0.055, pellets: 1, ammo: 340, color: '#fbbf24', price: 2400 },
  { id: 'coral_shotgun', name: 'Coral Shotgun', short: 'SHOTGUN', dmg: 20, cd: 0.56, range: 52, spread: 0.14, pellets: 6, ammo: 64, color: '#fb923c', price: 3600 },
  { id: 'helios_carbine', name: 'Helios Carbine', short: 'CARBINE', dmg: 42, cd: 0.125, range: 115, spread: 0.02, pellets: 1, ammo: 260, color: '#38bdf8', price: 5500 },
  { id: 'mirage_sniper', name: 'Mirage Marksman', short: 'SNIPER', dmg: 95, cd: 0.72, range: 170, spread: 0.005, pellets: 1, ammo: 40, color: '#f43f5e', price: 8500 },
  { id: 'sol_grenade', name: 'Flash-Frag', short: 'GRENADE', dmg: 135, cd: 0.85, range: 48, spread: 0.03, pellets: 1, ammo: 14, color: '#34d399', explosive: true, radius: 11, price: 3200 },
  { id: 'cobre_launcher', name: 'Cobre RPG-7X', short: 'RPG-7X', dmg: 220, cd: 1.25, range: 130, spread: 0.015, pellets: 1, ammo: 10, color: '#f97316', explosive: true, radius: 15, price: 14000 },
];

export const WANTED_TIERS = [
  { stars: 0, label: 'CLEAR', maxUnits: 0, chopper: false, swat: false, roadblock: false, cooldown: 0 },
  { stars: 1, label: 'PATROL ALERT', maxUnits: 2, chopper: false, swat: false, roadblock: false, cooldown: 14 },
  { stars: 2, label: 'ACTIVE PURSUIT', maxUnits: 3, chopper: false, swat: false, roadblock: false, cooldown: 20 },
  { stars: 3, label: 'INTERCEPTOR RESPONSE', maxUnits: 5, chopper: true, swat: false, roadblock: true, cooldown: 28 },
  { stars: 4, label: 'AIR & ROADBLOCK LOCKDOWN', maxUnits: 6, chopper: true, swat: true, roadblock: true, cooldown: 36 },
  { stars: 5, label: 'CITYWIDE SWAT MANHUNT', maxUnits: 7, chopper: true, swat: true, roadblock: true, cooldown: 46 },
];

export const RADIO_STATIONS = [
  { id: 'sol_marina', name: 'SOL MARINA 104.5 FM', genre: 'Sunset Synthwave', track: 'Coral Horizon 88', bpm: 118, root: 110, scale: [0, 3, 5, 7, 10] },
  { id: 'brisa_heat', name: 'BRISA HEAT 98.1 FM', genre: 'Coastal Bass & Club', track: 'Fuego Del Sol', bpm: 124, root: 98, scale: [0, 2, 3, 7, 9] },
  { id: 'mirage_nights', name: 'MIRAGE NIGHTS 88.9 FM', genre: 'Midnight Outrun', track: 'Chrome Palm Avenue', bpm: 130, root: 130.8, scale: [0, 3, 7, 10, 12] },
  { id: 'cobre_drive', name: 'COBRE DRIVE 107.3 FM', genre: 'Coastal Garage Rock', track: 'Saltwater Overdrive', bpm: 138, root: 82.4, scale: [0, 3, 5, 6, 7, 10] },
  { id: 'radio_off', name: 'RADIO OFF', genre: 'City & Engine Audio', track: 'Direct Exhaust', bpm: 0, root: 0, scale: [] },
];

export const GARAGE_UPGRADES = [
  { id: 'repair', label: 'Full Chassis Repair', cost: 1200, kind: 'service' },
  { id: 'respray', label: 'Custom Respray (Clear Heat)', cost: 2500, kind: 'service' },
  { id: 'engine', label: 'Twin-Turbo Engine Tune', cost: 4500, kind: 'tier', max: 3 },
  { id: 'armor', label: 'Kevlar Frame Armor', cost: 4000, kind: 'tier', max: 3 },
  { id: 'handling', label: 'Carbon Drift Suspension', cost: 3500, kind: 'tier', max: 3 },
  { id: 'body_armor', label: 'Tactical Vest Refill', cost: 1500, kind: 'gunshop' },
  { id: 'ammo_pack', label: 'Full Arsenal Ammo Crate', cost: 2200, kind: 'gunshop' },
  { id: 'heavy_unlock', label: 'Unlock RPG-7X & Sniper', cost: 12000, kind: 'gunshop' },
];

export const SERVICE_POIS = [
  { id: 'garage_coral', type: 'garage', name: 'Solaria Customs · Mirage', x: 102, z: -200, color: '#fbbf24' },
  { id: 'garage_docks', type: 'garage', name: 'Cobre Customs · Docks', x: -140, z: 220, color: '#fbbf24' },
  { id: 'gunshop_brisa', type: 'gunshop', name: 'Brisa Armory · Little Brisa', x: -200, z: 98, color: '#f43f5e' },
  { id: 'gunshop_strip', type: 'gunshop', name: 'Mirage Tactical · Strip', x: -22, z: -260, color: '#f43f5e' },
  { id: 'safehouse_coral', type: 'safehouse', name: 'Coral Penthouse Safehouse', x: 214, z: -90, color: '#34d399' },
  { id: 'safehouse_isle', type: 'safehouse', name: 'Starlight Villa Safehouse', x: 640, z: -90, color: '#34d399' },
];
