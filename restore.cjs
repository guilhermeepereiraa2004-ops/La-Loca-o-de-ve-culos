const cp = require('child_process');
const fs = require('fs');
const content = cp.execSync('git show HEAD:"src/components/admin/tabs/AdminInvestidores.jsx"').toString('utf8');
fs.writeFileSync('src/components/admin/tabs/AdminInvestidores.jsx', content);
