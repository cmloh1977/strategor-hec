const fs = require('fs');
const file = 'src/components/ConstellationView.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Find start and end of the old StrategicHeatmap 
let startLine = lines.findIndex(l => l.includes("function getHeatColor"));
if (startLine > -1) {
    // go backward to the comment "  // Business Model (score 1-5)"
    let removeStart = startLine - 1;
    while(removeStart > 0 && !lines[removeStart].includes("// Business Model (score 1-5)")) {
        removeStart--;
    }
    
    // Find the end of StrategicHeatmap function
    let removeEnd = startLine;
    let foundFunc = false;
    while(removeEnd < lines.length) {
        if (!foundFunc && lines[removeEnd].startsWith("function StrategicHeatmap")) foundFunc = true;
        if (foundFunc && lines[removeEnd] === "}") break;
        removeEnd++;
    }
    
    if (removeStart > -1 && removeEnd < lines.length) {
        lines.splice(removeStart, removeEnd - removeStart + 1);
        console.log(`Removed lines ${removeStart + 1} to ${removeEnd + 1}`);
    }
}

// Replace in Level2Patterns
const content = lines.join('\n').replace(/<StrategicHeatmap cards={cards} \/>/g, '<StrategicInsightChart cards={cards} />');
fs.writeFileSync(file, content);
console.log('Fixed ConstellationView.tsx');
