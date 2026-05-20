const fs     = require('fs');
const bcrypt = require('bcryptjs');
const path   = require('path');

const DB_FILE = path.join(__dirname, 'database.json');
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

const nextId = (rows) => rows.length === 0 ? 1 : Math.max(...rows.map(r => r.id)) + 1;

async function seed() {
  const hash1 = await bcrypt.hash('password123', 10);
  let admin1 = db.admins.find(a => a.email === 'admin@techflow.com');
  if (!admin1) {
    admin1 = { id: nextId(db.admins), email: 'admin@techflow.com', password: hash1, company_name: 'TechFlow Solutions', created_at: new Date().toISOString() };
    db.admins.push(admin1);
  }

  const hash2 = await bcrypt.hash('password123', 10);
  let admin2 = db.admins.find(a => a.email === 'admin@nexuslogistics.com');
  if (!admin2) {
    admin2 = { id: nextId(db.admins), email: 'admin@nexuslogistics.com', password: hash2, company_name: 'Nexus Logistics', created_at: new Date().toISOString() };
    db.admins.push(admin2);
  }

  const tf = [
    { id:'TF001', name:'Arjun Sharma',    dept:'Engineering', desig:'Software Engineer',    sal:72000, doj:'2022-03-01' },
    { id:'TF002', name:'Priya Nair',      dept:'Engineering', desig:'Senior Developer',     sal:85000, doj:'2022-07-15' },
    { id:'TF003', name:'Rohan Mehta',     dept:'Engineering', desig:'Full Stack Developer', sal:68000, doj:'2023-01-10' },
    { id:'TF004', name:'Ananya Krishnan', dept:'Product',     desig:'Product Manager',      sal:95000, doj:'2021-11-01' },
    { id:'TF005', name:'Karthik Rajan',   dept:'Design',      desig:'UI Designer',          sal:58000, doj:'2023-04-01' },
    { id:'TF006', name:'Deepa Suresh',    dept:'Design',      desig:'UX Designer',          sal:62000, doj:'2022-09-15' },
    { id:'TF007', name:'Meena Iyer',      dept:'HR',          desig:'HR Manager',           sal:55000, doj:'2021-06-01' },
    { id:'TF008', name:'Sanjay Patel',    dept:'Finance',     desig:'Finance Lead',         sal:78000, doj:'2022-01-20' },
    { id:'TF009', name:'Vikram Singh',    dept:'Operations',  desig:'Operations Lead',      sal:65000, doj:'2023-02-01' },
    { id:'TF010', name:'Pooja Menon',     dept:'Operations',  desig:'Operations Executive', sal:52000, doj:'2023-06-01' },
  ];

  for (const e of tf) {
    if (!db.employees.find(x => x.employee_id === e.id && x.admin_id === admin1.id)) {
      db.employees.push({
        id: nextId(db.employees),
        admin_id: admin1.id,
        employee_id: e.id,
        employee_name: e.name,
        email: e.name.toLowerCase().replace(' ', '.') + '@techflow.com',
        department: e.dept,
        designation: e.desig,
        salary: e.sal,
        phone: '9' + String(876100000 + db.employees.length),
        date_of_joining: e.doj,
        created_at: new Date().toISOString(),
      });
    }
  }

  const nl = [
    { id:'NL001', name:'Rajesh Kumar',    dept:'Warehouse',  desig:'Warehouse Lead',        sal:62000, doj:'2021-01-15' },
    { id:'NL002', name:'Sunita Rao',      dept:'Warehouse',  desig:'Floor Supervisor',      sal:48000, doj:'2021-05-10' },
    { id:'NL003', name:'Mohan Das',       dept:'Warehouse',  desig:'Picker',                sal:35000, doj:'2022-02-01' },
    { id:'NL004', name:'Lalitha S',       dept:'Warehouse',  desig:'Packer',                sal:33000, doj:'2022-04-15' },
    { id:'NL005', name:'Bala Murugan',    dept:'Transport',  desig:'Driver',                sal:38000, doj:'2021-08-01' },
    { id:'NL006', name:'Chandra Sekar',   dept:'Transport',  desig:'Driver',                sal:36000, doj:'2022-01-10' },
    { id:'NL007', name:'Kavitha Raman',   dept:'Transport',  desig:'Transport Lead',        sal:55000, doj:'2021-03-20' },
    { id:'NL008', name:'Senthil Nathan',  dept:'Fleet',      desig:'Fleet Manager',         sal:72000, doj:'2020-11-01' },
    { id:'NL009', name:'Prabhavathi M',   dept:'Fleet',      desig:'Fleet Coordinator',     sal:45000, doj:'2022-07-01' },
    { id:'NL010', name:'Dinesh Kumar',    dept:'IT',         desig:'IT Head',               sal:68000, doj:'2021-06-15' },
    { id:'NL011', name:'Arun Selvam',     dept:'IT',         desig:'Systems Administrator', sal:52000, doj:'2022-09-01' },
    { id:'NL012', name:'Geeta Pillai',    dept:'HR',         desig:'HR Executive',          sal:44000, doj:'2022-03-15' },
    { id:'NL013', name:'Harish Reddy',    dept:'Finance',    desig:'Accounts Executive',    sal:50000, doj:'2022-11-01' },
    { id:'NL014', name:'Indira Varma',    dept:'Operations', desig:'Operations Manager',    sal:80000, doj:'2020-07-01' },
    { id:'NL015', name:'Jagan Mohan',     dept:'Operations', desig:'Operations Associate',  sal:38000, doj:'2023-01-10' },
  ];

  for (const e of nl) {
    if (!db.employees.find(x => x.employee_id === e.id && x.admin_id === admin2.id)) {
      db.employees.push({
        id: nextId(db.employees),
        admin_id: admin2.id,
        employee_id: e.id,
        employee_name: e.name,
        email: e.name.toLowerCase().replace(' ', '.') + '@nexuslogistics.com',
        department: e.dept,
        designation: e.desig,
        salary: e.sal,
        phone: '9' + String(765100000 + db.employees.length),
        date_of_joining: e.doj,
        created_at: new Date().toISOString(),
      });
    }
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

  const e1 = db.employees.filter(e => e.admin_id === admin1.id).length;
  const e2 = db.employees.filter(e => e.admin_id === admin2.id).length;
  console.log('');
  console.log('SUCCESS! Test data added.');
  console.log('');
  console.log('Company 1 : TechFlow Solutions — ' + e1 + ' employees');
  console.log('  Login   : admin@techflow.com');
  console.log('  Password: password123');
  console.log('');
  console.log('Company 2 : Nexus Logistics — ' + e2 + ' employees');
  console.log('  Login   : admin@nexuslogistics.com');
  console.log('  Password: password123');
}

seed().catch(console.error);
