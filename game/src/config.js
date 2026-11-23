// Core constants, 7 districts, 18 vehicles, 8 weapons, 5 wanted tiers, 4 FM stations.
export const STEP=1/60,SAVE_STORAGE_KEY='solaria_bay_3d_saves_v1';
export const WORLD={blockPitch:120,roadWidth:26,sidewalkWidth:6,avenuesX:[-360,-240,-120,0,120,240],streetsZ:[-360,-240,-120,0,120,240,360],minX:-410,maxX:820,minZ:-410,maxZ:410,promenadeStartX:253,beachStartX:268,shorelineX:320,bridgeZ:0,bridgeStartX:260,bridgeEndX:556,bridgePeakY:18,pierZ:120,pierStartX:266,pierEndX:418,isleMinX:520,isleMaxX:760,isleMinZ:-210,isleMaxZ:210,defaultTime:16.55};
export const AVENUE_NAMES={'-360':'Cobre West Blvd','-240':'Palma Ridge Ave','-120':'Brisa Market Way',0:'Solaria Grand Ave',120:'Meridian Plaza Blvd',240:'Ocean Palm Blvd',560:'Starlight West Loop',720:'Starlight Bay Drive'};
export const STREET_NAMES={'-360':'Mirage North Ave','-240':'Neon Crest St','-120':'Sunset Plaza St',0:'Solaria Bridge Blvd',120:'Coral Pier Way',240:'Harbor Canal Rd',360:'Cobre Freight Ave'};

export const DISTRICTS=[
['coral_promenade','Coral Promenade','Art Deco Beachfront',150,335,-260,220,'#ff6b8b',18,44],['solaria_downtown','Solaria Downtown','Financial Towers',-150,150,-165,165,'#38bdf8',46,108],
['mirage_strip','Mirage Strip','Neon & Nightlife',-180,240,-410,-165,'#c084fc',24,60],['palma_vista','Palma Vista','Hillside Villas',-410,-150,-410,0,'#fb923c',12,28],
['little_brisa','Little Brisa','Cantinas & Markets',-410,-150,0,185,'#f43f5e',12,26],['cobre_docks','Cobre Docks','Freight Terminals',-410,240,185,410,'#f59e0b',14,30],
['starlight_isle','Starlight Isle','Resort & Yacht Basin',495,790,-240,240,'#2dd4bf',14,34],
].map(([id,name,sub,minX,maxX,minZ,maxZ,color,hMin,hMax])=>({id,name,sub,minX,maxX,minZ,maxZ,color,hMin,hMax}));

export const VEHICLES=Object.fromEntries([
['mako_v12','Mako V12 GT','Supercar','super',4.9,2.18,1.24,72,48,2.45,260,['#f22248','#ff476c','#0ea5e9','#f59e0b'],{stripe:'#1e293b',spoiler:true}],
['aureo_cabrio','Aureo Cabrio','Convertible','cabrio',4.7,2.08,1.18,64,42,2.55,220,['#f43f5e','#fde047','#38bdf8','#fb7185'],{openTop:true}],
['solaria_coupe','Solaria GT Coupe','Sports','coupe',4.65,2.04,1.28,62,40,2.4,230,['#2dd4bf','#a855f7','#f43f5e','#f8fafc'],{spoiler:true}],
['tormenta_muscle','Tormenta Sabre V8','Muscle','muscle',4.95,2.12,1.34,60,43,2.18,290,['#dc2626','#f59e0b','#059669','#334155'],{stripe:'#f8fafc',scoop:true}],
['brisa_sedan','Brisa Touring','Sedan','sedan',4.6,1.98,1.42,48,30,2.2,210,['#60a5fa','#e2e8f0','#34d399','#fbbf24','#f472b6']],
['palma_taxi','Solaria Bay Cab','Taxi','taxi',4.65,2,1.44,49,31,2.28,220,['#facc15'],{taxiSign:true}],
['cobre_suv','Cobre Atlas 4x4','SUV','suv',5.05,2.22,1.82,50,32,2,340,['#334155','#d97706','#64748b','#b91c1c']],
['boveda_armored','Boveda Bullion Van','Armored','van',5.7,2.38,2.28,44,26,1.8,540,['#8b9bb0'],{stripe:'#facc15',armored:true}],
['mirage_limo','Mirage Stretch VIP','Limousine','limo',6.8,2.1,1.42,48,28,1.72,310,['#f8fafc','#334155']],
['docks_pickup','Cobre Hauler','Pickup','pickup',5.2,2.16,1.78,47,30,2.05,310,['#ea580c','#0284c7','#64748b']],
['cargo_boxtruck','Solaria Freight','Truck','truck',6.4,2.42,2.75,39,21,1.65,460,['#e2e8f0','#fcd34d']],
['vortex_moto','Vortex R9 Bike','Motorcycle','moto',2.35,.88,1.12,68,52,2.95,145,['#ef4444','#22d3ee','#a855f7'],{isBike:true}],
['palma_scooter','Brisa Scooter','Scooter','scooter',2.05,.8,1.05,40,30,3.1,115,['#2dd4bf','#fb7185','#fde047'],{isBike:true}],
['sbpd_cruiser','SBPD Interceptor','Police','police',4.85,2.1,1.44,64,44,2.45,300,['#f8fafc'],{isPolice:true}],
['sbpd_enforcer','SBPD Pursuit SUV','Police SUV','police_suv',5.15,2.24,1.86,58,38,2.15,390,['#f8fafc'],{isPolice:true}],
['sbpd_swat','SBPD SWAT Bearcat','SWAT','swat',5.85,2.46,2.45,52,32,1.85,560,['#28416e'],{isPolice:true,armored:true}],
['corsair_boat','Corsair 380 Boat','Speedboat','boat',6.2,2.4,1.45,56,38,2.1,280,['#f8fafc','#22d3ee'],{stripe:'#ff4d6d',isBoat:true}],
['sbpd_air1','AIR-1 SBPD Falcon','Helicopter','heli',9.2,2.6,3.1,65,36,2,620,['#1f3a6b'],{isPolice:true,isHeli:true}],
].map(([id,name,cls,style,l,w,h,maxSpd,accel,turn,hp,colors,ex])=>[id,{id,name,cls,style,l,w,h,maxSpd,accel,turn,hp,colors,...ex}]));

export const WEAPONS=[
['fists','Street Brawl','FISTS',26,.36,3.4,0,1,0,'#f8fafc',0,{inf:true}],['viper_9mm','Viper 9mm','9MM',32,.22,90,.025,1,140,'#fde047',800],
['stinger_smg','Stinger SMG','SMG',24,.09,85,.055,1,340,'#fbbf24',2400],['coral_shotgun','Coral Shotgun','SHOTGUN',20,.56,52,.14,6,64,'#fb923c',3600],
['helios_carbine','Helios Carbine','CARBINE',42,.125,115,.02,1,260,'#38bdf8',5500],['mirage_sniper','Mirage Marksman','SNIPER',95,.72,170,.005,1,40,'#f43f5e',8500],
['sol_grenade','Flash-Frag','GRENADE',135,.85,48,.03,1,14,'#34d399',3200,{explosive:true,radius:11}],['cobre_launcher','Cobre RPG-7X','RPG-7X',220,1.25,130,.015,1,10,'#f97316',14000,{explosive:true,radius:15}],
].map(([id,name,short,dmg,cd,range,spread,pellets,ammo,color,price,ex])=>({id,name,short,dmg,cd,range,spread,pellets,ammo,color,price,...ex}));

export const WANTED_TIERS=[['CLEAR',0,0,0,0,0],['PATROL ALERT',2,0,0,0,14],['ACTIVE PURSUIT',3,0,0,0,20],['INTERCEPTOR RESPONSE',5,1,0,1,28],['AIR & ROADBLOCK LOCKDOWN',6,1,1,1,36],['CITYWIDE SWAT MANHUNT',7,1,1,1,46]].map(([label,maxUnits,c,s,r,cooldown],stars)=>({stars,label,maxUnits,chopper:Boolean(c),swat:Boolean(s),roadblock:Boolean(r),cooldown}));
export const RADIO_STATIONS=[['sol_marina','SOL MARINA 104.5 FM','Sunset Synthwave','Coral Horizon 88',118,110,[0,3,5,7,10]],['brisa_heat','BRISA HEAT 98.1 FM','Coastal Bass','Fuego Del Sol',124,98,[0,2,3,7,9]],['mirage_nights','MIRAGE NIGHTS 88.9 FM','Midnight Outrun','Chrome Palm Ave',130,130.8,[0,3,7,10,12]],['cobre_drive','COBRE DRIVE 107.3 FM','Garage Rock','Saltwater Drive',138,82.4,[0,3,5,6,7,10]],['radio_off','RADIO OFF','City Audio','Direct Exhaust',0,0,[]]].map(([id,name,genre,track,bpm,root,scale])=>({id,name,genre,track,bpm,root,scale}));
const GK=['service','tier','gunshop'],PT=['garage','gunshop','safehouse'],PC=['#fbbf24','#f43f5e','#34d399'];
export const GARAGE_UPGRADES=[['repair','Full Chassis Repair',1200,0],['respray','Custom Respray (Clear Heat)',2500,0],['engine','Twin-Turbo Engine Tune',4500,1,3],['armor','Kevlar Frame Armor',4000,1,3],['handling','Carbon Drift Suspension',3500,1,3],['body_armor','Tactical Vest Refill',1500,2],['ammo_pack','Full Arsenal Ammo Crate',2200,2],['heavy_unlock','Unlock RPG-7X & Sniper',12000,2]].map(([id,label,cost,k,max])=>({id,label,cost,kind:GK[k],...(max?{max}:{})}));
export const SERVICE_POIS=[['garage_coral',0,'Solaria Customs · Mirage',102,-200],['garage_docks',0,'Cobre Customs · Docks',-140,220],['gunshop_brisa',1,'Brisa Armory · Little Brisa',-200,98],['gunshop_strip',1,'Mirage Tactical · Strip',-22,-260],['safehouse_coral',2,'Coral Penthouse Safehouse',214,-90],['safehouse_isle',2,'Starlight Villa Safehouse',640,-90]].map(([id,k,name,x,z])=>({id,type:PT[k],name,x,z,color:PC[k]}));
