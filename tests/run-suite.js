
const path = require('path');
const { createSandbox } = require('./test-harness');
const { SimPlayer, PROFILES } = require('./sim-player');

const LEVELS = [
    { name: 'Level 1', file: 'lvl1.js' },
    { name: 'Level 2', file: 'lvl2.js' },
    { name: 'Level 3', file: 'lvl3.js' }
];

async function runSuite() {
    console.log('==================================================');
    console.log('      AUTOMATED PLAYER SIMULATION SUITE');
    console.log('==================================================');
    
    const results = [];

    for (const level of LEVELS) {
        console.log(`\nTesting ${level.name}...`);
        console.log('--------------------------------------------------');
        
        const scriptPath = path.join(__dirname, '../js', level.file);

        for (const profileKey in PROFILES) {
            const profile = PROFILES[profileKey];
            process.stdout.write(`  Running ${profile.name}... `);
            
            try {
                const sandbox = createSandbox(scriptPath);
                const player = new SimPlayer(sandbox, profile);
                
                const result = await player.play();
                
                if (result.completed) {
                    console.log(`✅ Success | Score: ${result.score} | Moves: ${result.moves}`);
                } else {
                    console.log(`❌ Failed  | Score: ${result.score} | Moves: ${result.moves}`);
                }

                results.push({
                    level: level.name,
                    profile: profile.name,
                    success: result.completed,
                    score: result.score,
                    moves: result.moves
                });

            } catch (err) {
                console.log(`❌ Error: ${err.message}`);
                // console.error(err);
            }
        }
    }

    console.log('\n==================================================');
    console.log('                SUMMARY REPORT');
    console.log('==================================================');
    console.table(results);
}

runSuite();
