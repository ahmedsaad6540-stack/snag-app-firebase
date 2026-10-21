const fs=require('node:fs');const path=require('node:path');
const {PARK_ITEMS,PARK_SECTORS}=require('../src/catalog');
const {RESTROOMS,COMPONENTS,RESTROOM_ZONES}=require('../src/restroomCatalog');
const {PARK_STREET_STORES_CATALOG,DEMO_UNITS_CATALOG}=require('../src/storesCatalog');
const template=fs.readFileSync(path.join(__dirname,'template.html'),'utf8');
const out=template.replace('/* __DATASET__ */', `const CATALOG = ${JSON.stringify({PARK_ITEMS,PARK_SECTORS,RESTROOMS,COMPONENTS,RESTROOM_ZONES,STORES_CATALOG:PARK_STREET_STORES_CATALOG,UNITS_CATALOG:DEMO_UNITS_CATALOG}).replace(/</g,'\\u003c')};`);
fs.writeFileSync(path.join(__dirname,'Park_Street_Operations_Interactive_Demo.html'),out,'utf8');
console.log('Offline interactive demo generated: preview/Park_Street_Operations_Interactive_Demo.html');
