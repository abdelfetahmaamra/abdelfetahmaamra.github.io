const fs = require('fs');

const files = ['src/styles/styles.css', 'src/styles/admin.css', 'index.html', 'src/lib/icons.tsx', 'src/store/ProductPage.tsx'];

const reps = [
  ['--ground:#FBF5F1;', '--ground:#F8FAF8;'],
  ['--ink:#2B1520;', '--ink:#00370B;'],
  ['--muted:#6E5560;', '--muted:#466B44;'],
  ['--soft:#5E4652;', '--soft:#2C522B;'],
  ['--line:#EADBD5;', '--line:#DFE8E0;'],
  ['--line2:#E4D3CD;', '--line2:#C9D6CB;'],
  ['--rose:#B23A5E;', '--rose:#D4A613;'],
  ['--rose-d:#8E3150;', '--rose-d:#B0880B;'],
  ['--teal:#1E5A55;', '--teal:#015112;'],
  ['--teal-bg:#EAF2EE;', '--teal-bg:#E6EDE7;'],
  ['--blush:#F6E4E2;', '--blush:#FCF6DB;'],
  
  // rgba replacements
  ['rgba(43,21,32,', 'rgba(0,55,11,'], // ink shadow
  ['rgba(178,58,94,', 'rgba(212,166,19,'], // rose shadow
  ['rgba(30,90,85,', 'rgba(1,81,18,'], // teal shadow

  // Hex codes in index.html and ProductPage
  ['#1E5A55', '#015112'],
  ['#B23A5E', '#D4A613'],
  
  // admin.css hardcoded
  ['#F6F1EE', '#F8FAF8'], // ground
  ['#F4E9EC', '#E6EDE7'],
  ['#CDBAC2', '#A3BBA0'],
  ['#E4D5DB', '#C9D6CB'],
  ['#EDE2DD', '#E6EDE7'],
  ['#F1E8E4', '#DFE8E0'],
  ['#123C38', '#00370B'], // spark hover
  ['#FFF4D6', '#FCF6DB'],
  ['#5C4300', '#B0880B'],
  ['#FCF8F6', '#F8FAF8'],
  ['#FCF6F3', '#F2F5F2'],
  ['#E1EBF1', '#E6EDE7'],
  ['#FFF1D6', '#FCF6DB'],
  ['#7A4E00', '#B0880B'],
  ['#EEE9E7', '#DFE8E0'],
  ['#5B5052', '#466B44'],
  ['#ECE2F0', '#E6EDE7'],
  ['#4B2A56', '#2C522B'],
  ['#DDEAF3', '#C9D6CB'],
  ['#1F4461', '#015112'],
  ['#E3F2E7', '#E6EDE7'],
  ['#1F5E36', '#015112'],
  ['#F1E4DF', '#FCF6DB'],
  ['#F0D9A6', '#D4A613'],
  ['#6B4400', '#B0880B'],
  ['#F2C9D1', '#FBE9EC'],
  ['#1F7A4D', '#015112'],

  // styles.css specific border hover
  ['border-color:#E4CFC8', 'border-color:#C9D6CB'],
  ['#F1E4DF', '#E6EDE7'],
  ['#F1E2DC', '#DFE8E0'], // stage arch
  ['#F0E4DF', '#DFE8E0'],
  ['#F6ECE8', '#E6EDE7'], // qty btn
  ['#EFDCD6', '#C9D6CB'],
  ['#F1E6E2', '#DFE8E0'], // skeleton
  ['#F8F0ED', '#F8FAF8'],
  ['#F3E9DA', '#FCF6DB'], // usage box
  ['#4A3540', '#00370B'],
];

files.forEach(f => {
  if (!fs.existsSync(f)) {
      console.log('Skipping ' + f);
      return;
  }
  let content = fs.readFileSync(f, 'utf8');
  reps.forEach(([oldStr, newStr]) => {
    content = content.split(oldStr).join(newStr);
  });
  // special case for icons.tsx
  if (f === 'src/lib/icons.tsx') {
    content = content.replace(/fill="#B23A5E"/g, 'fill="#015112"'); // For Logo fallback
    content = content.replace(/stroke="#FBF5F1"/g, 'stroke="#D4A613"');
    content = content.replace(/stroke="#B23A5E"/g, 'stroke="#015112"'); // For Pattern fallback
  }
  fs.writeFileSync(f, content);
  console.log('Updated ' + f);
});
console.log("Colors successfully updated!");
