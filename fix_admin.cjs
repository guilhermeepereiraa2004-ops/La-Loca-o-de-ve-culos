const fs = require('fs');
const filePath = 'src/components/admin/tabs/AdminInvestidores.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Add monthKey
const search1 = "      monthlySummaries.push({\n        month: `${monthLabels[parseInt(mo) - 1]}/${yr}`,";
const replace1 = "      monthlySummaries.push({\n        monthKey: month,\n        month: `${monthLabels[parseInt(mo) - 1]}/${yr}`,";
content = content.replace(search1, replace1);

// Fix 2: Remove the .includes split logic which matches the first month of the year
const search2 = "const summary = monthlySummaries.find(s => s.monthKey === activeMonth || s.month === activeMonth || s.month.includes(activeMonth.split('-')[0]));";
const replace2 = "const summary = monthlySummaries.find(s => s.monthKey === activeMonth);";
content = content.replace(search2, replace2);

fs.writeFileSync(filePath, content);
console.log("Fixes applied.");
