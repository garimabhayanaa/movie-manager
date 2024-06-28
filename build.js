const fs = require('fs');
const ejs = require('ejs');

const templatesDir = './views';
const outputDir = './dist';

if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir);
}

fs.readdir(templatesDir, (err, files) => {
    if (err) throw err;

    files.forEach(file => {
        if (file.endsWith('.ejs')) {
            const template = fs.readFileSync(`${templatesDir}/${file}`, 'utf-8');
            const html = ejs.render(template);

            fs.writeFileSync(`${outputDir}/${file.replace('.ejs', '.html')}`, html);
            console.log(`Compiled ${file} to HTML`);
        }
    });
});